import { Resolved } from "jazz-tools";
import { AIModelSettings } from "../schema/schema";
import { string, z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import { SentenceWithLocation } from "../editor/splitter";

function makeFeedbackResponseSchema(sentences: [string, ...string[]]) {
    const SentenceIdLiteral = z.enum(sentences); // must have at least 1
    const SentenceIdLiteral2 = z.enum(sentences); // must have at least 1
    const feedbackCategories = z.enum(["Clarity", "Organization", "Argumentation", "Evidence", "Originality", "Style"]);
    const IssueCommentSchema = z.object({
        feedback: z.string(),
        type: z.literal("issue"),
        category: feedbackCategories,
        severity: z.enum(["low", "medium", "high"]),
        sentenceID: SentenceIdLiteral,
        sentence: z.string(),
      });
      
      const MissingCommentSchema = z.object({
        feedback: z.string(),
        type: z.literal("missing"),
        category: feedbackCategories,
        severity: z.enum(["low", "medium", "high"]),
        closestSentenceID: SentenceIdLiteral2,
        closestSentence: z.string(),
        position: z.enum(["before", "after"])
      });
      const FeedbackCommentSchema = z.union([IssueCommentSchema, MissingCommentSchema]);

      const FeedbackResponseSchema = z.array(FeedbackCommentSchema)

      return FeedbackResponseSchema;
  }  

export type IssueComment = {
    feedback: string;
    type: "issue";
    category: string;
    severity: "low" | "medium" | "high";
    sentenceID: string;
    sentence: string;
}
export type MissingComment = {
    feedback: string;
    type: "missing";
    category: string;
    severity: "low" | "medium" | "high";
    closestSentenceID: string;
    closestSentence: string;
    position: "before" | "after";
}
export type BaseFeedbackResponse = (IssueComment | MissingComment)[]

export async function sendFeedback(
  fullText: string,
  prompt: string,
  sentences: SentenceWithLocation[],
  opts: Resolved<AIModelSettings, {}>
): Promise<BaseFeedbackResponse> {
  const isOpenAI = opts.source === "openai"

  const systemPrompt = `
---

You are an assistant that provides structured, high-level writing feedback.
Your task is to review the provided sentences and return detailed feedback **only if needed**.
If a paragraph is clearly still in progress, there's no need to provide feedback on any of its sentences.
Feedback should focus on clarity, organization, argumentation, originality, evidence, and logical flow.
It should be adapted based on the sentence's likely role, as well as considering what paragraph it's in.
For example, in an introduction paragraph, the first sentence should likely be a hook for the essay, whereas in a body paragraph, it should likely be a more straightforward topic sentence.

You will recieve an input JSON object with the following fields:
- "essay": the full text of the essay
- "essayPrompt": the prompt for the essay (this might be empty, in which case only analyze the essay on its own)
- "sentences": an array of sentences in the essay, each with a unique ID and the text of the sentence. Use this to reference specific sentences in your feedback.
The sentences are in the order they appear in the essay, and each sentence has a unique ID.

Output a JSON array of feedback comments. 
Feedback comments can either be issues with existing sentences or sentences that are missing from the argument.
Feedback should only be on a sentence to sentence basis, not on the paragraph as a whole.
Also, do not include any positive feedback--only constructive negative feedback. (If there's nothing that needs to be fixed, simply don't provide any feedback on that sentence.)
Be especially hesitant with "missing" feedback--only if it is truly necessary for that paragraph to be complete.
NONE OF YOUR COMMENTS SHOULD JUST BE SUMMARIZING SENTENCES OR PARAGRAPHS.

Each feedback comment takes the format of a JSON object with the following fields shared between the two:
{
  "type": either "issue" or "missing"
  "feedback": the feedback itself. this should be a short, clear sentence or two summarizing the problem with the sentence or what the missing sentence should include. For example, "This sentence is unclear" or "This doesn't explain why <the evidence> is relevant to <the argument>."
  "category": a short label like "Clarity", "Organization", "Argumentation", etc.
  "severity": "low", "medium", or "high"
}

For "issue" feedback, also include these properties:
{
  - "sentenceID": the id of the sentence being commented on
  - "sentence": the exact text of the sentence being commented on. Don't include the identifier or leading/trailing whitespace. Include punctuation.
}
For "missing" feedback, also include these properties:
{
  - "closestSentenceID": the id of the closest sentence to where the missing one should go
  - "closestSentence": the exact text of the closest sentence. Don't include the identifier or leading/trailing whitespace. Include punctuation.
  - "position": either "before" or "after" to indicate where in relation to the "closestSentenceID" the missing sentence should be inserted
}

Only give feedback if it truly improves the essay. Do not invent issues if none exist. 
Be specific and actionable in your feedback. Avoid vague statements like "this is unclear" or "this is bad".
Be careful with "missing" feedback--only give it if the paragraph is clearly incomplete.
Give some flexibility on exactly adhering to the provided essay prompt (if it is provided)--a clear and well-organized argument is more important than strict adherence to the prompt.
Do not just summarize the essay or sentences--this should be actual feedback.`;

  const userPrompt = `
ESSAY PROMPT: 
${prompt}

ESSAY TEXT:
${fullText}

SENTENCES AND IDS:
${sentences.map((s) => `(${s.id}) ${s.text}`).join("\n")}
`


  const sentenceIds = sentences.map(s => s.id);
  if(sentenceIds.length === 0) throw new Error("Empty text shouldn't be sent to AI")
  const schema = makeFeedbackResponseSchema(sentenceIds as [string, ...string[]]);
  
  const messages = isOpenAI
    ? [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
    ] : [
      // { role: "user", content: `${systemPrompt} \n ${userPrompt}` },
      { role: "user", content: `${userPrompt}\n${systemPrompt}` },
  ]

  console.log("message: ", messages[0].content)

  const payload = {
    model: opts.model,
    messages,
    temperature: 0.3,
    format: zodToJsonSchema(schema),
    stream: false
  };

  const url = isOpenAI
    ? "https://api.openai.com/v1/chat/completions"
    : `${opts.ollamaURL}/api/chat`;

  const headers: {} = isOpenAI
    ? { "Content-Type": "application/json", Authorization: `Bearer ${opts.apiKey}` }
    : { "Content-Type": "application/json" };

  const body = JSON.stringify(payload);

  const res = await fetch(url, { method: "POST", headers, body });
  const data = await res.json();

  const content = isOpenAI
    ? data.choices[0].message.content
    : data.message.content

  if (!content) throw new Error("No content returned from AI");

  try {
    const parsed: BaseFeedbackResponse = JSON.parse(content);
    validateAIResponse(parsed, sentences);
    return parsed;
  } catch (e) {
    console.error("Failed to parse or validate AI JSON output", e);
    throw new Error("Invalid AI response format");
  }
}

function validateAIResponse(
  response: BaseFeedbackResponse,
  sentences: SentenceWithLocation[],
) {
  let hallucinations = 0;
  const sentenceIDs = new Map(sentences.map(s => [s.id, s.text]));
  response.forEach(comment => {
    const returnedID = comment.type === "issue" ? comment.sentenceID : comment.closestSentenceID;
    const returnedText = comment.type === "issue" ? comment.sentence : comment.closestSentence;
    const correctText = sentenceIDs.get(returnedID);
    if(correctText !== returnedText) {
      hallucinations++;
      console.warn(`AI hallucinated sentence text for id ${returnedID}: expected "${correctText}", got "${returnedText}"`);
    }
  })
  if(hallucinations > 0) {
    console.warn(`AI hallucinated ${hallucinations}/${response.length} sentence texts`);
  } 
}

export async function testAI(
  opts: Resolved<AIModelSettings, {}>
): Promise<void> {
  const isOpenAI = opts.source === "openai"
  const systemPrompt = ``;
  
  const payload = {
    model: opts.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: "Summarize our conversation so far." }
    ],
    temperature: 0.2,
    stream: false
  };

  const url = isOpenAI
    ? "https://api.openai.com/v1/chat/completions"
    : `${opts.ollamaURL}/api/chat`;

  const headers: {} = isOpenAI
    ? { "Content-Type": "application/json", Authorization: `Bearer ${opts.apiKey}` }
    : { "Content-Type": "application/json" };

  const body = JSON.stringify(payload);

  const res = await fetch(url, { method: "POST", headers, body });
  const data = await res.json();

  const content = data.message.content

  if (!content) throw new Error("No content returned from AI");

  console.log("AI response:", content);
}
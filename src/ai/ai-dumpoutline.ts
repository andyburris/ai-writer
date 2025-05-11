import { Resolved } from "jazz-tools";
import { AIModelSettings } from "../schema/schema";
import { string, z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import { SentenceWithLocation } from "../editor/splitter";

function makeScaffoldSchema() {
      const ScaffoldSchema = z.string()

      return ScaffoldSchema;
}

export async function createScaffold(
  braindump: string,
  outline: string,
  prompt: string,
  opts: Resolved<AIModelSettings, {}>,
): Promise<string> {
  const isOpenAI = opts.source === "openai"

  const systemPrompt = `
You are a helpful assistant that begins writing an argumentative essay based on a braindump and outline.
Your task is to use the content from the braindump and organize it in the structure provided by the outline.

The braindump is a collection of ideas, thoughts, and notes that are not yet organized into a coherent flow or argument.
The user then wrote an outline that describes the structure of the essay they want to write.

You will get information in a JSON object with the following keys:
- "braindump": a string containing the braindump content
- "outline": a string containing the outline content
- "essayPrompt": a string containing the prompt for the essay

Your output will be an incomplete essay containing sentences from the braindump in the structure of the outline.
Don't add any new thoughts of your own, just what's in the braindump.
If the braindump contains coherent sentences, use them as close to possible as they are.
(You can change words around the edges to have them flow naturally around one another, but again, no new thoughts.)
If the braindump contains abbreviated sentences, you can rewrite them to be more coherent, but same thing--no new thoughts.
If the outline has complete sentences as its bullet points, you can use those as well, but prefer the braindump content.

The paragraphs of the output essay should be in the same order as the outline. 
The sentences in each paragraph should be in roughly the same order as the sub-points in the outline (though you have a little flexibility here).

If there is a point in the outline that you can't fill in from the braindump (or a sentence/idea you think needs to be added for a coherent argument), surround a description of what the sentence should contain (though not an actual sentence that would fit those criteria) with triple square brackets.
For example, if the outline mentions a piece of evidence but doesn't explain how it relates to the argument, you could say something like:
"[[[How does this relate to <the argument>?]]]"

Output just the essay, with no other text.
Don't include any JSON or other formatting.
`;

  const userPrompt = `
ESSAY PROMPT:
${prompt}

BRAINDUMP:
${braindump}

OUTLINE:
${outline}
  `

  const schema = makeScaffoldSchema();
  
  const messages = isOpenAI
    ? [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(userPrompt) }
    ] : [
        { role: "user", content: `${systemPrompt} \n ${userPrompt}` },
        // { role: "user", content: `${JSON.stringify(userPrompt)} \n \n ${systemPrompt}` },
    ]

console.log("message: ", messages[0].content)

  const payload = {
    model: opts.model,
    messages,
    temperature: 0.3,
    // format: zodToJsonSchema(schema),
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
    return content;
  } catch (e) {
    console.error("Failed to parse or validate AI JSON output", e);
    throw new Error("Invalid AI response format");
  }
}
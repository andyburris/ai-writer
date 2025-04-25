import { schema } from "@tiptap/pm/schema-basic";

type AIProvider = "openai" | "ollama";

interface PromptOptions {
  provider: AIProvider;
  model?: string;
  apiKey?: string; // Only required for OpenAI
}

let cachedPrompts: string[] | null = null;

export async function getEssayPrompt(opts: PromptOptions): Promise<string> {
  if (cachedPrompts?.length) {
    const index = Math.floor(Math.random() * cachedPrompts.length);
    return cachedPrompts.splice(index, 1)[0]; // Remove to avoid duplicates
  }

  const responseText = await fetchPromptList(opts);
  cachedPrompts = parsePromptList(responseText);
  return getEssayPrompt(opts); // Recursively fetch the first prompt
}

async function fetchPromptList(opts: PromptOptions): Promise<string> {
  const generationPrompt = `You are an assistant that generates a list of unique and thought-provoking essay prompts.

Requirements:
- Each prompt should relate to real-world issues or values.
- Avoid technical or highly specialized topics.
- Each prompt should be short (1–2 sentences) and encourage debate.
- Avoid repeating common school essay topics.

Output exactly 10 prompts in a pure JSON array of strings. Example format:
[
  "Should cities ban private cars from downtown areas?",
  "Is universal basic income a viable solution to job automation?",
  ...
]`;

  if (opts.provider === "openai") {
    if (!opts.apiKey) throw new Error("OpenAI API key is required");

    const model = opts.model ?? "gpt-4-turbo";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: generationPrompt }],
        temperature: 1.2,
        response_format: "json", // Enforce JSON output
        format: schema,
        max_tokens: 200,
        stream: false,
      }),
    });

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  }

  if (opts.provider === "ollama") {
    const model = opts.model ?? "llama3";

    const schema = {
      type: "array",
      items: {
        type: "string",
      },
    };

    const res = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: generationPrompt }],
        temperature: 1.2,
        stream: false,
        format: schema, // Enforce structured JSON output
      }),
    });

    const data = await res.json();
    return data.message?.content ?? "";
  }

  throw new Error("Unknown provider");
}

function parsePromptList(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every(item => typeof item === "string")) {
      return parsed;
    }
  } catch (e) {
    console.error("Failed to parse JSON:", e);
  }
  throw new Error("Invalid prompt list format received from AI");
}

import { JsonTextProvider } from "./jsonProvider";

/** OpenAI chat-completions adapter. Model name comes from admin config/env. */
export class OpenAITextProvider extends JsonTextProvider {
  readonly name = "openai";

  constructor(
    private apiKey: string,
    private model: string,
  ) {
    super();
  }

  protected async chatJson(system: string, user: string): Promise<string> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`OpenAI text API ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI text API returned no content");
    return content;
  }
}

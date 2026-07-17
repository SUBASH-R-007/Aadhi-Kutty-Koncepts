import { z } from "zod";
import {
  outlineSchema,
  pageGenResultSchema,
  type Outline,
  type PageGenResult,
} from "@/lib/content/schemas";
import {
  creativeContextSchema,
  emptyCreativeContext,
  type CreativeContextData,
} from "@/lib/creativeContext/schema";
import {
  creativeContextSystemPrompt,
  creativeContextUserPrompt,
  outlineSystemPrompt,
  outlineUserPrompt,
  pageSystemPrompt,
  pageUserPrompt,
} from "./prompts";
import type { OutlineInput, PageGenInput, TextProvider } from "./types";

/**
 * Shared base for chat-completion providers that return JSON. Subclasses only
 * implement the raw chat call; parsing, validation, and one retry live here.
 */
export abstract class JsonTextProvider implements TextProvider {
  abstract readonly name: string;

  protected abstract chatJson(system: string, user: string): Promise<string>;

  private async task<T>(
    system: string,
    user: string,
    schema: z.ZodType<T>,
  ): Promise<T> {
    let lastError = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      const raw = await this.chatJson(
        system,
        attempt === 0
          ? user
          : `${user}\n\nYour previous reply was invalid (${lastError}). Reply again with STRICTLY valid JSON in the required shape.`,
      );
      try {
        const parsed = schema.safeParse(JSON.parse(stripFences(raw)));
        if (parsed.success) return parsed.data;
        lastError = parsed.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ");
      } catch (e) {
        lastError = e instanceof Error ? e.message : "unparseable JSON";
      }
    }
    throw new Error(`${this.name}: invalid JSON response (${lastError})`);
  }

  outline(input: OutlineInput): Promise<Outline> {
    return this.task(outlineSystemPrompt(), outlineUserPrompt(input), outlineSchema);
  }

  generatePage(input: PageGenInput): Promise<PageGenResult> {
    return this.task(pageSystemPrompt(), pageUserPrompt(input), pageGenResultSchema);
  }

  async extractCreativeContext(
    raw: string,
    name: string,
  ): Promise<CreativeContextData> {
    const partial = await this.task(
      creativeContextSystemPrompt(),
      creativeContextUserPrompt(raw),
      creativeContextSchema.omit({ name: true, version: true }).partial(),
    );
    return creativeContextSchema.parse({
      ...emptyCreativeContext(name),
      ...partial,
      name,
      version: 1,
    });
  }
}

function stripFences(raw: string): string {
  const trimmed = raw.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fence ? fence[1] : trimmed;
}

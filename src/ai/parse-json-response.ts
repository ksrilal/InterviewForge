import type { ZodSchema } from "zod";

export class AIResponseValidationError extends Error {
  constructor(message: string, public readonly raw: string) {
    super(message);
    this.name = "AIResponseValidationError";
  }
}

// Strips markdown code fences if the model wraps its JSON despite instructions not to.
function stripCodeFences(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fenced ? fenced[1] : text;
}

// Last-resort fallback when the model adds stray prose around the JSON
// (e.g. "Here are the questions:" before it) without fencing it - slices to
// the outermost braces rather than trusting the whole string is pure JSON.
function extractOutermostObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return text;
  return text.slice(start, end + 1);
}

export function parseAndValidate<T>(rawText: string, schema: ZodSchema<T>): T {
  const cleaned = stripCodeFences(rawText.trim());

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    try {
      parsed = JSON.parse(extractOutermostObject(cleaned));
    } catch {
      throw new AIResponseValidationError("Response was not valid JSON", rawText);
    }
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new AIResponseValidationError(
      `Response did not match expected schema: ${result.error.message}`,
      rawText
    );
  }

  return result.data;
}

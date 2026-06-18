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

export function parseAndValidate<T>(rawText: string, schema: ZodSchema<T>): T {
  const cleaned = stripCodeFences(rawText.trim());

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new AIResponseValidationError("Response was not valid JSON", rawText);
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

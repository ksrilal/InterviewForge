// Estimated USD cost per AI call, from a small hardcoded price-per-million-
// tokens table keyed by model. There's no live pricing API in use - this
// needs a manual update if you switch models or a provider reprices.
const PRICING_PER_MILLION_TOKENS: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-sonnet-4-5": { input: 3, output: 15 },
  "claude-opus-4-8": { input: 15, output: 75 },
  "claude-haiku-4-5": { input: 0.8, output: 4 },
  "gpt-4.1": { input: 2, output: 8 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4o": { input: 2.5, output: 10 },
};

// Used when the configured model isn't in the table above, so a price
// change or new model doesn't silently report $0.
const FALLBACK_PRICING = { input: 3, output: 15 };

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING_PER_MILLION_TOKENS[model] ?? FALLBACK_PRICING;
  const cost = (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

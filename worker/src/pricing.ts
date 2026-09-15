export interface ModelPrice {
  inputPerMTok: number;
  outputPerMTok: number;
}

/** Keep prices in one place so they can be updated without touching the agent loop. */
export const MODEL_PRICES: Record<string, ModelPrice> = {
  default: { inputPerMTok: 3, outputPerMTok: 15 },
  'claude-sonnet-5': { inputPerMTok: 3, outputPerMTok: 15 },
  'claude-sonnet-4-6': { inputPerMTok: 3, outputPerMTok: 15 },
  'claude-sonnet-4-5': { inputPerMTok: 3, outputPerMTok: 15 },
  'claude-3-5-sonnet-latest': { inputPerMTok: 3, outputPerMTok: 15 },
  'claude-3-5-sonnet-20241022': { inputPerMTok: 3, outputPerMTok: 15 },
  'claude-3-haiku-20240307': { inputPerMTok: 0.25, outputPerMTok: 1.25 },
  'claude-3-5-haiku-latest': { inputPerMTok: 0.8, outputPerMTok: 4 },
};

export function priceForModel(model: string): ModelPrice {
  return MODEL_PRICES[model] ?? MODEL_PRICES.default;
}

export function costUsd(model: string, inputTokens: number, outputTokens: number): number {
  const price = priceForModel(model);
  const input = Math.max(0, inputTokens) / 1_000_000;
  const output = Math.max(0, outputTokens) / 1_000_000;
  return input * price.inputPerMTok + output * price.outputPerMTok;
}

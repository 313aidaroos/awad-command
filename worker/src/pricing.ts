// Change note (Claude, Sep 2026): Current Claude prices (Sonnet 5 is $2/$10); retired models removed. See docs/LAUNCH_NOTES.md.
export interface ModelPrice {
  inputPerMTok: number;
  outputPerMTok: number;
}

/** Keep prices in one place so they can be updated without touching the agent loop. */
export const MODEL_PRICES: Record<string, ModelPrice> = {
  // Unknown models are priced conservatively: this feeds the worker's spending cap.
  default: { inputPerMTok: 3, outputPerMTok: 15 },
  'claude-opus-5': { inputPerMTok: 5, outputPerMTok: 25 },
  'claude-sonnet-5': { inputPerMTok: 2, outputPerMTok: 10 },
  'claude-sonnet-4-6': { inputPerMTok: 3, outputPerMTok: 15 },
  'claude-sonnet-4-5': { inputPerMTok: 3, outputPerMTok: 15 },
  'claude-haiku-4-5': { inputPerMTok: 1, outputPerMTok: 5 },
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

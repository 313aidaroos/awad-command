/**
 * Alpaca paper tradable pairs use the slash form (XRP/USD).
 * XLM/USD is not on the Alpaca paper asset list. It is research-only.
 */

export const paperTradablePairs = [
  "BTC/USD",
  "ETH/USD",
  "SOL/USD",
  "XRP/USD",
  "DOGE/USD",
] as const;

export const researchOnlyPairs = ["XLM/USD"] as const;

export type PaperTradablePair = (typeof paperTradablePairs)[number];
export type ResearchOnlyPair = (typeof researchOnlyPairs)[number];

export const xlmXrpNotes = {
  scout: "/workspace/awadbot/docs/scout/XLM-XRP-paper-watch-2026-09-21.md",
  learner: "/workspace/awadbot/docs/notes/XLM_XRP.md",
  xrp: {
    pair: "XRP/USD" as const,
    tradable: true,
    headline: "Decision zone $1.45–1.50",
    confirm: "Confirm above about $1.50–1.51",
    invalidate: "Invalidate below about $1.345–1.36",
  },
  xlm: {
    pair: "XLM/USD" as const,
    tradable: false,
    headline: "Coil near $0.20",
    confirm: "Confirm above $0.20–0.21 on the daily with volume",
    invalidate: "Invalidate below $0.18",
  },
} as const;

export function isResearchOnlySymbol(symbol: string) {
  const upper = symbol.trim().toUpperCase().replaceAll("-", "/");
  const base = upper.includes("/")
    ? upper.split("/")[0]
    : upper.endsWith("USD")
      ? upper.slice(0, -3)
      : upper;
  return base === "XLM" || researchOnlyPairs.some((pair) => pair === upper);
}

import {
  disconnectedSnapshot,
  type Snapshot,
  type FloorEvent,
  type Metrics,
} from "./model";
const metrics: Metrics = {
  netReturn: 8.2,
  slippageEfficiency: 0.91,
  maxDrawdown: 3.1,
  sharpe: 2.2,
  sortino: 2.9,
  winRate: 0.57,
  profitFactor: 1.72,
  averageWin: 2.3,
  averageLoss: 1.1,
  consistency: 0.82,
  tradeCount: 124,
  btcAlpha: 3.2,
  uptime: 0.998,
  violations: 0,
  turnover: 3.2,
  feeEfficiency: 0.95,
};
const sequence: [FloorEvent["eventType"], string, string, string][] = [
  [
    "SIGNAL_DETECTED",
    "samurai",
    "BTC",
    "Scout detected a resistance breakout in the sample market.",
  ],
  [
    "PATTERN_DETECTED",
    "samurai",
    "BTC",
    "Breakout pattern recorded; volume exceeds the sample baseline.",
  ],
  [
    "THESIS_CREATED",
    "samurai",
    "BTC",
    "Momentum thesis: continuation above resistance; invalid below the stop.",
  ],
  [
    "ORDER_PROPOSED",
    "samurai",
    "BTC",
    "Trader proposed a paper entry within the sample sizing boundary.",
  ],
  [
    "RISK_APPROVED",
    "samurai",
    "BTC",
    "Sample exposure and daily-loss checks passed.",
  ],
  [
    "AI_VETO_APPROVED",
    "samurai",
    "BTC",
    "Structured thesis review found no conflicting veto condition.",
  ],
  [
    "GUARDRAIL_APPROVED",
    "samurai",
    "BTC",
    "Sample whitelist, capital cap and freshness checks passed.",
  ],
  [
    "ORDER_SUBMITTED",
    "samurai",
    "BTC",
    "Paper order recorded in this fixed illustrative replay.",
  ],
  [
    "ORDER_FILLED",
    "samurai",
    "BTC",
    "Sample fill recorded. No order was sent to an exchange.",
  ],
  [
    "NEWS_DETECTED",
    "phantom",
    "ETH",
    "Illustrative news watch: analysts review a macro-event scenario.",
  ],
  [
    "RISK_REJECTED",
    "neon",
    "SOL",
    "Sample mean-reversion entry rejected: volatility above team limit.",
  ],
  [
    "TARGET_TRIGGERED",
    "samurai",
    "BTC",
    "Sample target reached. Paper scenario closed.",
  ],
];
export const sampleEvents: FloorEvent[] = sequence.map(
  ([eventType, teamId, symbol, description], i) => ({
    id: `sample-event-${i + 1}`,
    timestamp: `2026-09-18T14:${String(12 + Math.floor(i / 6)).padStart(2, "0")}:${String((i % 6) * 9).padStart(2, "0")}.000Z`,
    teamId,
    agentId: null,
    eventType,
    symbol,
    tradeId: teamId === "samurai" ? "SAMPLE-SAM-BTC-001" : null,
    orderId: teamId === "samurai" && i > 6 ? "SAMPLE-ORDER-001" : null,
    severity: eventType === "RISK_REJECTED" ? "warning" : "info",
    title: eventType.replaceAll("_", " "),
    description,
    mode: "PAPER",
    correlationId:
      teamId === "samurai"
        ? "sample-correlation-001"
        : `sample-correlation-${i}`,
    source: "Fixed illustrative fixture",
    payload: {
      rationale: description,
      supportingEvidence: [
        "Sample trend alignment",
        "Sample volume confirmation",
      ],
      conflictingEvidence: ["Macro headline uncertainty"],
      confidence: 0.71,
    },
  }),
);
export function sampleSnapshot(): Snapshot {
  const s = disconnectedSnapshot();
  return {
    ...s,
    source: "Illustrative paper fixture — not engine telemetry",
    timestamp: "2026-09-18T14:14:00.000Z",
    regime: "TRENDING_UP (SAMPLE)",
    teams: s.teams.map((t, i) => ({
      ...t,
      pnl: [82, 54, 31, -12][i],
      openTrades: [2, 1, 1, 0][i],
      risk: i === 1 ? "MODERATE" : "LOW",
      metrics: {
        ...metrics,
        netReturn: [8.2, 5.4, 3.1, -1.2][i],
        maxDrawdown: [3.1, 6.8, 4.2, 8.9][i],
        winRate: [0.57, 0.54, 0.61, 0.48][i],
        btcAlpha: [3.2, 0.4, -1.9, -6.2][i],
        tradeCount: [124, 118, 121, 112][i],
      },
    })),
    markets: [
      ["BTC", 56420.13, 2.1],
      ["ETH", 3242.67, 1.8],
      ["SOL", 127.43, 3.6],
      ["XRP", 0.5821, 1.4],
      ["BNB", 516.22, 2.3],
      ["DOGE", 0.1043, 4.1],
    ].map(([symbol, price, change]) => ({
      symbol: String(symbol),
      price: Number(price),
      change: Number(change),
      timestamp: s.timestamp,
    })),
    portfolio: {
      paperBalance: 4155,
      liveBalance: null,
      paperPnl: 155,
      livePnl: null,
      openPositions: 4,
    },
    events: sampleEvents,
  };
}

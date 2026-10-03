import type { ReviewSummary } from "./review";

const empty = { trades: 0, wins: 0, losses: 0, winRate: null, avgWin: null, avgLoss: null, expectancy: null, expectancyPct: null, profitFactor: null, realized: 0, maxDrawdown: 0, best: null, worst: null };
export const summary: ReviewSummary = {
    day: "2026-10-02",
    generatedAt: "2026-10-02T13:00:00.000Z",
    siteUrl: "https://awad-command.vercel.app",
    robot: { status: "RUNNING", lastTickAt: "2026-10-02T12:55:00.000Z", ticks24h: 288, uptimePct: 100, staleTicks: 0, dedicatedAccount: false, noOwnAccount: true },
    killSwitch: { halted: false, reason: null },
    watching: [],
    floor: { capital: 100_000, equity: 100_120, pnl24h: 120, pnl24hPct: 0.12, openPositions: 1, trades24h: 1, winRate24h: 1, realized24h: 15 },
    desks: [{ id: "neon", name: "NEON", strategy: "dip-v1", label: "Buy the dip", enabled: true, pausedUntil: null, lossCapPct: -4, atLossCap: true, version: 2, capital: 25_000, equity: 25_120, pnl24h: 120, pnl24hPct: 0.48, realizedAllTime: 15, stats24h: empty, stats7d: empty, bySymbol24h: {}, open: [{ symbol: "ETH/USD", qty: 0.12, entry: 4000, price: 4100, pnlPct: 2.5, pnl: 12 }], tuning: { reason: "deeper <dip>", before: {}, after: {} } }],
    trades24h: [{ desk: "neon", book: "neon", symbol: "SOL/USD", entryAt: "", exitAt: "", qty: 2, entryPrice: 190, exitPrice: 197.5, pnl: 15, pnlPct: 3.9, exitReason: "Take profit" }],
    experiments: [],
    strategies: {
      d1: [
        { strategy: "dip-v1", label: "Buy the dip (Awad's)", desk: "neon", assetClasses: ["crypto"], trades: 1, wins: 1, winRate: 1, pnl: 15, maxDrawdown: 0, avgHoldHours: 5.5, open: 1 },
        { strategy: "meanrev-v1", label: "Mean reversion", desk: "neon", assetClasses: ["stock"], trades: 0, wins: 0, winRate: null, pnl: 0, maxDrawdown: 0, avgHoldHours: null, open: 0 },
      ],
      d7: [
        { strategy: "dip-v1", label: "Buy the dip (Awad's)", desk: "neon", assetClasses: ["crypto"], trades: 4, wins: 3, winRate: 0.75, pnl: 42, maxDrawdown: 12, avgHoldHours: 0.5, open: 1 },
        { strategy: "meanrev-v1", label: "Mean reversion", desk: "neon", assetClasses: ["stock"], trades: 2, wins: 1, winRate: 0.5, pnl: -3, maxDrawdown: 8, avgHoldHours: 20, open: 0 },
      ],
    },
    realMoney: { connected: false, ok: false, totalUsd: null, enabledDesks: [], pnl: 0, trades24h: 0, limits: { maxTotalUsd: 100, maxTradeUsd: 25, dayLossUsd: 10 }, note: "Coinbase not connected" },
    learning: { meetings24h: 9, failedMeetings24h: 0, adopted: [{ desk: "ronin", reason: "KAEDE: volume ignition with a trailing stop" }], notes: [{ desk: "neon", author: "SORA", kind: "lesson", title: "Dips <b>fail</b> in downtrends", body: "3 of 4 losers came while BTC was under its 50h EMA." }] },
    issues: ["Shared account"],
    aiNote: "Quiet day.",
  };

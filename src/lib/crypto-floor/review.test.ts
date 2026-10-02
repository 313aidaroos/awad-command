import { describe, expect, it } from "vitest";
import { tuneParams } from "./review";
import { reportHtml, reportSubject, reportText } from "./report";
import { STRATEGIES } from "./strategies";
import type { ReviewSummary } from "./review";

const mom = STRATEGIES["momentum-v1"].defaults;
const dip = STRATEGIES["dip-v1"].defaults;

describe("tuneParams (ROBOT-SPEC Step 5)", () => {
  it("does nothing without enough closed trades", () => {
    expect(tuneParams("momentum-v1", mom, { trades: 2, winRate: 0, expectancy: -5 })).toBeNull();
  });
  it("momentum: negative expectancy raises the entry threshold by 0.5 (max 4)", () => {
    expect(tuneParams("momentum-v1", mom, { trades: 5, winRate: 0.2, expectancy: -3 })!.params.entryThresholdPct).toBe(2.5);
    expect(tuneParams("momentum-v1", { ...mom, entryThresholdPct: 4 }, { trades: 5, winRate: 0.2, expectancy: -3 })).toBeNull();
  });
  it("momentum: >60% win rate with positive expectancy lowers it by 0.25 (min 1.5)", () => {
    expect(tuneParams("momentum-v1", mom, { trades: 5, winRate: 0.8, expectancy: 4 })!.params.entryThresholdPct).toBe(1.75);
    expect(tuneParams("momentum-v1", { ...mom, entryThresholdPct: 1.5 }, { trades: 5, winRate: 0.8, expectancy: 4 })).toBeNull();
  });
  it("dip: negative expectancy deepens the dip by 1% (max −8)", () => {
    expect(tuneParams("dip-v1", dip, { trades: 3, winRate: 0.3, expectancy: -1 })!.params.dipThresholdPct).toBe(-5);
    expect(tuneParams("dip-v1", { ...dip, dipThresholdPct: -8 }, { trades: 3, winRate: 0.3, expectancy: -1 })).toBeNull();
  });
  it("dip: strong results make it 0.5% shallower (min −2.5)", () => {
    expect(tuneParams("dip-v1", dip, { trades: 4, winRate: 0.75, expectancy: 2 })!.params.dipThresholdPct).toBe(-3.5);
    expect(tuneParams("dip-v1", { ...dip, dipThresholdPct: -2.5 }, { trades: 4, winRate: 0.75, expectancy: 2 })).toBeNull();
  });
  it("swing and breakout are not auto-tuned", () => {
    expect(tuneParams("swing-v1", STRATEGIES["swing-v1"].defaults, { trades: 9, winRate: 0, expectancy: -9 })).toBeNull();
  });
});

describe("daily brief", () => {
  const empty = { trades: 0, wins: 0, losses: 0, winRate: null, avgWin: null, avgLoss: null, expectancy: null, expectancyPct: null, profitFactor: null, realized: 0, maxDrawdown: 0, best: null, worst: null };
  const summary: ReviewSummary = {
    day: "2026-10-02",
    generatedAt: "2026-10-02T13:00:00.000Z",
    siteUrl: "https://awad-command.vercel.app",
    robot: { status: "RUNNING", lastTickAt: "2026-10-02T12:55:00.000Z", ticks24h: 288, uptimePct: 100, staleTicks: 0, dedicatedAccount: false },
    killSwitch: { halted: false, reason: null },
    watching: [],
    floor: { capital: 100_000, equity: 100_120, pnl24h: 120, pnl24hPct: 0.12, openPositions: 1, trades24h: 1, winRate24h: 1, realized24h: 15 },
    desks: [{ id: "neon", name: "NEON", strategy: "dip-v1", label: "Buy the dip", enabled: true, pausedUntil: null, version: 2, capital: 25_000, equity: 25_120, pnl24h: 120, pnl24hPct: 0.48, realizedAllTime: 15, stats24h: empty, stats7d: empty, bySymbol24h: {}, open: [{ symbol: "ETH/USD", qty: 0.12, entry: 4000, price: 4100, pnlPct: 2.5, pnl: 12 }], tuning: { reason: "deeper <dip>", before: {}, after: {} } }],
    trades24h: [{ desk: "neon", book: "neon", symbol: "SOL/USD", entryAt: "", exitAt: "", qty: 2, entryPrice: 190, exitPrice: 197.5, pnl: 15, pnlPct: 3.9, exitReason: "Take profit" }],
    experiments: [],
    issues: ["Shared account"],
    aiNote: "Quiet day.",
  };
  it("subject carries the day, P&L and robot status", () => {
    expect(reportSubject(summary)).toBe("Crypto Floor 2026-10-02 · +$120.00 (+0.12%) · 1 closed trade · robot running 100%");
  });
  it("text and html include desks, trades, issues and escape HTML", () => {
    const text = reportText(summary);
    expect(text).toContain("NEON (Buy the dip, v2)");
    expect(text).toContain("LEARNED: deeper <dip>");
    expect(text).toContain("Shared account");
    const html = reportHtml(summary);
    expect(html).toContain("deeper &lt;dip&gt;");
    expect(html).not.toContain("deeper <dip>");
    expect(html).toContain("https://awad-command.vercel.app/crypto-floor");
  });
});

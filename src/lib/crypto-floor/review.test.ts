import { describe, expect, it } from "vitest";
import { tuneParams } from "./review";
import { reportHtml, reportSubject, reportText } from "./report";
import { STRATEGIES } from "./strategies";
import { summary as fixtureSummary } from "./review.test.fixture";

// Explicit pre-2026-10-02 values so these rules stay pinned regardless of the (riskier) defaults.
const mom = { ...STRATEGIES["momentum-v1"].defaults, entryThresholdPct: 2 };
const dip = { ...STRATEGIES["dip-v1"].defaults, dipThresholdPct: -4 };

describe("tuneParams (ROBOT-SPEC Step 5)", () => {
  it("does nothing without enough closed trades", () => {
    expect(tuneParams("momentum-v1", mom, { trades: 2, winRate: 0, expectancy: -5 })).toBeNull();
  });
  it("momentum: negative expectancy raises the entry threshold by 0.5 (max 4)", () => {
    expect(tuneParams("momentum-v1", mom, { trades: 5, winRate: 0.2, expectancy: -3 })!.params.entryThresholdPct).toBe(2.5);
    expect(tuneParams("momentum-v1", { ...mom, entryThresholdPct: 4 }, { trades: 5, winRate: 0.2, expectancy: -3 })).toBeNull();
  });
  it("momentum: >60% win rate with positive expectancy lowers it by 0.25 (never raises it)", () => {
    expect(tuneParams("momentum-v1", mom, { trades: 5, winRate: 0.8, expectancy: 4 })!.params.entryThresholdPct).toBe(1.75);
    // riskier default 0.75%: a winning streak may only lower it (to the 0.25% bound), never push it back up to 1.5%
    expect(tuneParams("momentum-v1", { ...mom, entryThresholdPct: 0.75 }, { trades: 5, winRate: 0.8, expectancy: 4 })!.params.entryThresholdPct).toBe(0.5);
    expect(tuneParams("momentum-v1", { ...mom, entryThresholdPct: 0.25 }, { trades: 5, winRate: 0.8, expectancy: 4 })).toBeNull();
  });
  it("dip: negative expectancy deepens the dip by 1% (max −8)", () => {
    expect(tuneParams("dip-v1", dip, { trades: 3, winRate: 0.3, expectancy: -1 })!.params.dipThresholdPct).toBe(-5);
    expect(tuneParams("dip-v1", { ...dip, dipThresholdPct: -8 }, { trades: 3, winRate: 0.3, expectancy: -1 })).toBeNull();
  });
  it("dip: strong results make it 0.5% shallower (min −1.5, never deeper)", () => {
    expect(tuneParams("dip-v1", dip, { trades: 4, winRate: 0.75, expectancy: 2 })!.params.dipThresholdPct).toBe(-3.5);
    expect(tuneParams("dip-v1", { ...dip, dipThresholdPct: -1.5 }, { trades: 4, winRate: 0.75, expectancy: 2 })).toBeNull();
    expect(tuneParams("dip-v1", { ...dip, dipThresholdPct: -1.2 }, { trades: 4, winRate: 0.75, expectancy: 2 })).toBeNull();
  });
  it("swing and breakout are not auto-tuned", () => {
    expect(tuneParams("swing-v1", STRATEGIES["swing-v1"].defaults, { trades: 9, winRate: 0, expectancy: -9 })).toBeNull();
  });
});

describe("daily brief", () => {
  const summary = fixtureSummary;
  it("subject carries the day, P&L and robot status", () => {
    expect(reportSubject(summary)).toBe("Crypto Floor 2026-10-02 · +$120.00 (+0.12%) · 1 closed trade · robot running 100%");
  });
  it("text and html include desks, trades, issues and escape HTML", () => {
    const text = reportText(summary);
    expect(text).toContain("NEON (Buy the dip, v2, LOSS CAP HIT (-4%))");
    expect(text).toContain("LEARNED: deeper <dip>");
    expect(text).toContain("Shared account");
    expect(text).toContain("REAL MONEY (COINBASE)");
    expect(text).toContain("OFF for every team");
    expect(text).toContain("WHAT THE TEAMS LEARNED (24h)");
    expect(text).toContain("9 team meetings held · 1 change adopted on paper");
    expect(text).toContain("ADOPTED RONIN: KAEDE: volume ignition");
    const html = reportHtml(summary);
    expect(html).toContain("deeper &lt;dip&gt;");
    expect(html).not.toContain("deeper <dip>");
    expect(html).toContain("Dips &lt;b&gt;fail&lt;/b&gt; in downtrends");
    expect(html).toContain("https://awad-command.vercel.app/crypto-floor");
  });
});

describe("daily per-strategy comparison + no-own-account banner (2026-10-02)", () => {
  it("appears in the existing daily email text and html", async () => {
    const mod = await import("./review.test.fixture");
    const text = reportText(mod.summary);
    expect(text).toContain("STRATEGY COMPARISON (24h · 7d");
    expect(text).toMatch(/NEON dip-v1 \(Buy the dip \(Awad's\), crypto\): 24h 1 trades, win 100%, P\/L \+\$15\.00, max DD \$0\.00, avg hold 5\.5h · 7d 4 trades, win 75%, P\/L \+\$42\.00, max DD −\$12\.00, avg hold 30m/);
    expect(text).toContain("NEON meanrev-v1 (Mean reversion, stock)");
    expect(text).toContain("NO OWN ACCOUNT — the floor is NOT trading");
    const html = reportHtml(mod.summary);
    expect(html).toContain("Strategy comparison (24h / 7d)");
    expect(html).toContain("meanrev-v1");
    expect(html).toContain("NO OWN ACCOUNT");
    expect(html).toContain("LOSS CAP HIT");
  });
});

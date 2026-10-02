import { describe, expect, it } from "vitest";
import { GATE, drawdownCap, judgeBacktest, judgeExperiment } from "./lab";

const bt = (returnPct: number, trades = 10, expectancy: number | null = 5, maxDrawdownPct = 3) => ({ returnPct, trades, expectancy, maxDrawdownPct });

describe("evidence gate — adopting a change (checked by code, not by the agents)", () => {
  it("adopts a backtest that clearly beats the current settings on 30 and 90 days", () => {
    expect(judgeBacktest("samurai", bt(3), bt(1), bt(6), bt(2))).toEqual({ ok: true, failures: [] });
  });

  it("refuses thin, marginal, losing or riskier evidence", () => {
    expect(judgeBacktest("samurai", bt(3, 4), bt(1)).failures.join()).toMatch(/only 4 trades/);
    expect(judgeBacktest("samurai", bt(1.3), bt(1)).failures.join()).toMatch(/not ≥ 0.5 points above/);
    expect(judgeBacktest("samurai", bt(3, 10, -1), bt(1)).failures.join()).toMatch(/expectancy is not positive/);
    expect(judgeBacktest("samurai", bt(3, 10, 5, 9), bt(1, 10, 5, 8)).failures.join()).toMatch(/over the 8% team cap/);
    expect(judgeBacktest("samurai", bt(3, 10, 5, 5), bt(1, 10, 5, 3)).failures.join()).toMatch(/1.5× the current/);
    expect(judgeBacktest("samurai", bt(3), bt(1), bt(1), bt(2)).failures.join()).toMatch(/over 90 days it is worse/);
  });

  it("RONIN may run more drawdown (15% cap) but still needs the edge", () => {
    expect(drawdownCap("ronin")).toBe(15);
    expect(judgeBacktest("ronin", bt(8, 12, 9, 12), bt(2, 10, 3, 9)).ok).toBe(true);
    expect(judgeBacktest("ronin", bt(8, 12, 9, 16), bt(2, 10, 3, 14)).ok).toBe(false);
  });

  it("forward tests need 5 closed trades, positive expectancy and to beat the desk", () => {
    expect(judgeExperiment({ trades: 6, expectancy: 4, returnPct: 1.2, deskReturnPct: 0.4 }).ok).toBe(true);
    expect(judgeExperiment({ trades: 4, expectancy: 4, returnPct: 1.2, deskReturnPct: 0.4 }).failures.join()).toMatch(/only 4 closed/);
    expect(judgeExperiment({ trades: 6, expectancy: -1, returnPct: 1.2, deskReturnPct: 0.4 }).ok).toBe(false);
    expect(judgeExperiment({ trades: 6, expectancy: 4, returnPct: 0.3, deskReturnPct: 0.4 }).ok).toBe(false);
    expect(GATE.cooldownMs).toBe(24 * 3_600_000);
  });
});

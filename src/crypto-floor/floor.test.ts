import { describe, it, expect } from "vitest";
import { awadScore, defaultScoreConfig, promotionReadiness } from "./scoring";
import { disconnectedSnapshot, snapshotSchema, desks, roles } from "./model";
import { sampleSnapshot } from "./sample";
import { filterEvents } from "./replay";
describe("Crypto Floor preview isolation", () => {
  it("has sixteen illustrated paper roles without enabling an engine", () => {
    const s = sampleSnapshot();
    expect(desks.length * roles.length).toBe(16);
    expect(s.engine).toBe("OFFLINE");
    expect(s.teams.every((t) => t.mode === "PAPER")).toBe(true);
    expect(s.portfolio.liveBalance).toBeNull();
    expect(snapshotSchema.safeParse(s).success).toBe(true);
  });
  it("never substitutes sample money in connection status", () => {
    const s = disconnectedSnapshot();
    expect(s.portfolio.paperBalance).toBeNull();
    expect(s.events).toEqual([]);
    expect(s.markets).toEqual([]);
    expect(s.teams.every((t) => awadScore(t.metrics) === null)).toBe(true);
  });
  it("scores risk rather than just raw profit", () => {
    const m = sampleSnapshot().teams[0].metrics;
    expect(awadScore({ ...m, maxDrawdown: 14, violations: 5 })!).toBeLessThan(
      awadScore(m)!,
    );
    expect(awadScore({ ...m, sharpe: null })).toBeNull();
  });
  it("rejects invalid weight rules and fails closed on insufficient promotion evidence", () => {
    const m = sampleSnapshot().teams[0].metrics;
    expect(() =>
      awadScore(m, {
        ...defaultScoreConfig,
        netReturn: { weight: -1, min: 0, max: 10 },
      }),
    ).toThrow();
    expect(promotionReadiness(m, 1).eligible).toBe(false);
    expect(promotionReadiness({ ...m, violations: 1 }, 60).eligible).toBe(
      false,
    );
  });
  it("replays only matching fixed events, in timestamp order", () => {
    const s = sampleSnapshot();
    const events = filterEvents([...s.events].reverse(), {
      team: "samurai",
      symbol: "BTC",
      trade: "SAMPLE-SAM-BTC-001",
      date: "2026-09-18",
      time: "14:13",
      event: "",
    });
    expect(events.length).toBeGreaterThan(0);
    expect(
      events.every(
        (e) => e.teamId === "samurai" && e.timestamp >= "2026-09-18T14:13",
      ),
    ).toBe(true);
    expect(events.map((e) => e.timestamp)).toEqual(
      events.map((e) => e.timestamp).sort(),
    );
    expect(
      filterEvents(s.events, {
        team: "orbit",
        symbol: "",
        trade: "",
        date: "",
        time: "",
        event: "",
      }),
    ).toEqual([]);
  });
});

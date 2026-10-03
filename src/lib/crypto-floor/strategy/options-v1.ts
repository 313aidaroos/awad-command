/**
 * options-v1 (ORBIT lane, 2026-10-02): DEFINED-RISK options on liquid underlyings. PURE.
 * Long premium only: a long CALL when the hourly EMA9 crossed above EMA21 within `crossLookbackBars` and the close is
 * above EMA9; a long PUT on the mirror-image cross down. No naked short options, ever: the only sells are closes of
 * contracts the desk holds. The engine picks the contract (7–30 DTE, near the money) and sizes it so
 * premium × 100 × contracts ≤ the desk's options max loss (risk.ts). Regular hours only (engine).
 * Exits: premium stop, premium target, max hold, or ≤ minDteExit days to expiry.
 */
import { daysToExpiry, parseOcc } from "../assets";
import type { Bar, Position, RecentEntry, Signal } from "../types";
import { emaLast, heldHours, lastCross } from "./indicators";

export type OptionsConfig = {
  underlyings: string[];
  fastEma: number;
  slowEma: number;
  crossLookbackBars: number;
  premiumStopPct: number;
  premiumTakePct: number;
  maxHoldHours: number;
  minDteExit: number;
  maxOpenPositions: number;
  minEntryIntervalHours: number;
};

export function runOptionsStrategy(c: OptionsConfig, bars: Map<string, Bar[]>, positions: Position[], recent: RecentEntry[], now: number): { signals: Signal[] } {
  const signals: Signal[] = [];
  for (const p of positions) {
    const dte = daysToExpiry(p.symbol, now);
    const reason =
      p.unrealizedPnlPct <= c.premiumStopPct ? `Option stop: premium ${p.unrealizedPnlPct.toFixed(1)}% ≤ ${c.premiumStopPct}%`
      : p.unrealizedPnlPct >= c.premiumTakePct ? `Option target: premium +${p.unrealizedPnlPct.toFixed(1)}% ≥ ${c.premiumTakePct}%`
      : dte !== null && dte <= c.minDteExit ? `Option expiry exit: ${dte.toFixed(1)} days left`
      : heldHours(p.enteredAt, now) >= c.maxHoldHours ? `Option time exit: held ${heldHours(p.enteredAt, now).toFixed(0)}h`
      : null;
    // Closing sell of a LONG contract the desk holds (engine caps qty at the held long quantity).
    if (reason) signals.push({ type: "exit", symbol: p.symbol, side: "sell", reason, pnlPct: p.unrealizedPnlPct });
  }
  let room = c.maxOpenPositions - positions.length;
  const heldUnderlyings = new Set(positions.map((p) => parseOcc(p.symbol)?.underlying ?? p.symbol));
  const recentUnderlyings = recent
    .filter((e) => Date.parse(e.timestamp) > now - c.minEntryIntervalHours * 3_600_000)
    .map((e) => parseOcc(e.symbol)?.underlying ?? e.symbol);
  for (const u of c.underlyings) {
    if (room <= 0) break;
    if (heldUnderlyings.has(u) || recentUnderlyings.includes(u)) continue;
    const b = bars.get(u) ?? [];
    if (b.length < c.slowEma + 2) continue;
    const x = lastCross(b, c.fastEma, c.slowEma, c.crossLookbackBars);
    const fast = emaLast(b, c.fastEma);
    const last = b[b.length - 1].close;
    if (!x || fast === null) continue;
    if (x.dir === "up" && last > fast) {
      signals.push({ type: "entry", symbol: u, side: "buy", optionRight: "call", reason: `Long call: EMA${c.fastEma} crossed above EMA${c.slowEma} ${x.barsAgo}h ago, close above EMA${c.fastEma}` });
      room--;
    } else if (x.dir === "down" && last < fast) {
      signals.push({ type: "entry", symbol: u, side: "buy", optionRight: "put", reason: `Long put: EMA${c.fastEma} crossed below EMA${c.slowEma} ${x.barsAgo}h ago, close below EMA${c.fastEma}` });
      room--;
    }
  }
  return { signals };
}

/**
 * Per-strategy results, side by side (2026-10-02). PURE. Every desk lane (primary strategy + side lanes) is scored
 * from the floor's own ledger: closed round trips grouped by the strategy that OPENED them.
 * Used by the daily email/report (review.ts → report.ts) and the floor UI (state.ts → RobotConsole).
 */
import { assetClass, type AssetClass } from "./assets";
import { deskAssets, deskLanes } from "./desks";
import { tradeStats, type ClosedTrade } from "./ledger";
import { STRATEGIES } from "./strategies";
import type { DeskId, StrategyId } from "./types";

export type StrategyResult = {
  strategy: string;
  label: string;
  desk: string;
  /** Asset classes this lane traded in the window (or can trade, when it has no trades yet). */
  assetClasses: AssetClass[];
  trades: number;
  wins: number;
  winRate: number | null;
  pnl: number;
  maxDrawdown: number;
  avgHoldHours: number | null;
  open: number;
};

type DeskLike = { id: string; strategy: StrategyId };

export function strategyComparison(
  desks: DeskLike[],
  trades: Array<ClosedTrade & { desk: string }>,
  openPositions: Array<{ desk: string; symbol: string; strategy?: string | null }>,
  since?: number,
): StrategyResult[] {
  const rows: StrategyResult[] = [];
  for (const d of desks) {
    for (const lane of deskLanes(d.id, d.strategy)) {
      const own = (t: { strategy?: string | null }) => (t.strategy ?? d.strategy) === lane;
      const list = trades.filter((t) => t.desk === d.id && own(t) && (since === undefined || Date.parse(t.exitAt) >= since));
      const st = tradeStats(list);
      const holds = list.map((t) => (Date.parse(t.exitAt) - Date.parse(t.entryAt)) / 3_600_000).filter((h) => Number.isFinite(h) && h >= 0);
      const openHere = openPositions.filter((p) => p.desk === d.id && (p.strategy ?? d.strategy) === lane);
      // Traded in the window or held now; with neither, what the lane can trade on this desk.
      const classes = new Set<AssetClass>([...list, ...openHere].map((t) => assetClass(t.symbol)));
      if (!classes.size) for (const k of laneCapability(d.id, lane)) classes.add(k);
      rows.push({
        strategy: lane,
        label: STRATEGIES[lane]?.label ?? lane,
        desk: d.id as DeskId,
        assetClasses: [...classes],
        trades: st.trades,
        wins: st.wins,
        winRate: st.winRate,
        pnl: st.realized,
        maxDrawdown: st.maxDrawdown,
        avgHoldHours: holds.length ? holds.reduce((s, h) => s + h, 0) / holds.length : null,
        open: openHere.length,
      });
    }
  }
  return rows.sort((a, b) => b.pnl - a.pnl || b.trades - a.trades);
}

/** Asset classes a lane can trade on its desk: options-v1 → options only; others → crypto (+ stocks where the desk trades them). */
function laneCapability(desk: string, lane: string): AssetClass[] {
  if (lane === "options-v1") return ["option"];
  return deskAssets(desk).stocks ? ["crypto", "stock"] : ["crypto"];
}

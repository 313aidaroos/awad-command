import { desks as visualDesks, roles } from "@/crypto-floor/model";
import { STRATEGIES } from "./strategies";
import type { DeskId, StrategyId } from "./types";

/** Desk → strategy wiring, and the four named agents on each desk (same names as the floor art). */
export const DESK_STRATEGY: Record<DeskId, StrategyId> = {
  samurai: "momentum-v1",
  neon: "dip-v1",
  orbit: "swing-v1",
  phantom: "breakout-v1",
  ronin: "custom-v1",
};

/**
 * 2026-10-02 riskier floor: side-by-side lanes. Each desk runs its primary strategy plus these, all on the desk's own
 * book (one ledger, one loss cap). A position belongs to the lane that opened it; only that lane exits it.
 * Each lane strategy runs on exactly one desk, so client_order_ids (cf-<strategy>-…) stay unique.
 */
export const DESK_LANES: Record<DeskId, StrategyId[]> = {
  samurai: ["trend-v1"],
  neon: ["meanrev-v1"],
  orbit: ["options-v1"],
  phantom: ["scalp-v1"],
  ronin: [],
};

export type DeskAssets = { crypto: true; stocks: boolean; options: boolean };

/** Asset classes per desk. Crypto everywhere (24/7); stocks on SAMURAI/NEON/PHANTOM; options (long premium) on ORBIT. */
export const DESK_ASSETS: Record<DeskId, DeskAssets> = {
  samurai: { crypto: true, stocks: true, options: false },
  neon: { crypto: true, stocks: true, options: false },
  orbit: { crypto: true, stocks: false, options: true },
  phantom: { crypto: true, stocks: true, options: false },
  ronin: { crypto: true, stocks: false, options: false },
};

/** Primary first, then the desk's lanes (no duplicates). */
export function deskLanes(desk: string, primary: StrategyId): StrategyId[] {
  const extra = (DESK_LANES as Record<string, StrategyId[]>)[desk] ?? [];
  return [primary, ...extra.filter((s) => s !== primary)];
}

export function deskAssets(desk: string): DeskAssets {
  return (DESK_ASSETS as Record<string, DeskAssets>)[desk] ?? { crypto: true, stocks: false, options: false };
}

export type AgentRole = (typeof roles)[number];

export type DeskAgent = { name: string; role: AgentRole; desk: DeskId; deskName: string };

type Roster = { id: DeskId; name: string; color: string; symbol: string; names: readonly string[] };

/**
 * Every desk's team. The four core desks come from the floor art (model.ts); RONIN, the higher-risk team that
 * invents its own strategies, is not in the art yet (its design comes later), so its roster lives here.
 * Names are in role order: Scout, Analyst (desk lead), Trader, Risk Officer.
 */
export const ROSTERS: Roster[] = [
  ...visualDesks.map((d) => ({ id: d.id as DeskId, name: d.name, color: d.color, symbol: d.symbol, names: d.names })),
  { id: "ronin", name: "RONIN", color: "#ffb547", symbol: "浪", names: ["JIN", "KAEDE", "RYU", "TORA"] },
];

export function deskRoster(desk: string): Roster | null {
  return ROSTERS.find((x) => x.id === desk) ?? null;
}

export function deskAgents(desk: DeskId): DeskAgent[] {
  const d = deskRoster(desk);
  if (!d) return [];
  return roles.map((role, i) => ({ name: d.names[i], role, desk, deskName: d.name }));
}

/** The desk lead the owner talks to by default: the Analyst. */
export function deskLead(desk: DeskId): DeskAgent {
  return deskAgents(desk)[1];
}

export function findAgent(name: string): DeskAgent | null {
  const key = name.trim().toUpperCase();
  for (const d of ROSTERS) {
    const i = d.names.indexOf(key);
    if (i >= 0) return { name: d.names[i], role: roles[i], desk: d.id, deskName: d.name };
  }
  return null;
}

/** Robot event type + role → the agent who "did" it on the floor. */
export function agentForEvent(desk: string | null, agentRole: string): string | null {
  const d = desk ? deskRoster(desk) : null;
  if (!d) return null;
  const idx = { scout: 0, analyst: 1, trader: 2, risk: 3 }[agentRole];
  return idx === undefined ? null : d.names[idx];
}

export function deskStrategyLabel(desk: DeskId): string {
  return STRATEGIES[DESK_STRATEGY[desk]].label;
}

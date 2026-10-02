import { desks as visualDesks, roles } from "@/crypto-floor/model";
import { STRATEGIES } from "./strategies";
import type { DeskId, StrategyId } from "./types";

/** Desk → strategy wiring, and the four named agents on each desk (same names as the floor art). */
export const DESK_STRATEGY: Record<DeskId, StrategyId> = {
  samurai: "momentum-v1",
  neon: "dip-v1",
  orbit: "swing-v1",
  phantom: "breakout-v1",
};

export type AgentRole = (typeof roles)[number];

export type DeskAgent = { name: string; role: AgentRole; desk: DeskId; deskName: string };

export function deskAgents(desk: DeskId): DeskAgent[] {
  const d = visualDesks.find((x) => x.id === desk);
  if (!d) return [];
  return roles.map((role, i) => ({ name: d.names[i], role, desk, deskName: d.name }));
}

/** The desk lead the owner talks to by default: the Analyst. */
export function deskLead(desk: DeskId): DeskAgent {
  return deskAgents(desk)[1];
}

export function findAgent(name: string): DeskAgent | null {
  const key = name.trim().toUpperCase();
  for (const d of visualDesks) {
    const i = (d.names as readonly string[]).indexOf(key);
    if (i >= 0) return { name: d.names[i], role: roles[i], desk: d.id as DeskId, deskName: d.name };
  }
  return null;
}

/** Robot event type + role → the agent who "did" it on the floor. */
export function agentForEvent(desk: string | null, agentRole: string): string | null {
  const d = visualDesks.find((x) => x.id === desk);
  if (!d) return null;
  const idx = { scout: 0, analyst: 1, trader: 2, risk: 3 }[agentRole];
  return idx === undefined ? null : d.names[idx];
}

export function deskStrategyLabel(desk: DeskId): string {
  return STRATEGIES[DESK_STRATEGY[desk]].label;
}

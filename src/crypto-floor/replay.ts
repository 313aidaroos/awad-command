import type { FloorEvent } from "./model";
export type ReplayFilter = {
  team: string;
  symbol: string;
  trade: string;
  date: string;
  time: string;
  event: string;
};
export function filterEvents(events: FloorEvent[], filter: ReplayFilter) {
  return events
    .filter(
      (e) =>
        (!filter.team || e.teamId === filter.team) &&
        (!filter.symbol || e.symbol === filter.symbol) &&
        (!filter.trade || e.tradeId === filter.trade) &&
        (!filter.date || e.timestamp.startsWith(filter.date)) &&
        (!filter.time || e.timestamp.slice(11, 16) >= filter.time) &&
        (!filter.event || e.eventType === filter.event),
    )
    .sort(
      (a, b) =>
        a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id),
    );
}
export function agentRoleForEvent(type: string) {
  if (/SIGNAL|PATTERN|NEWS/.test(type)) return "Scout";
  if (/THESIS/.test(type)) return "Analyst";
  if (/RISK|GUARDRAIL|VETO|STOP|KILL/.test(type)) return "Risk Officer";
  return "Trader";
}

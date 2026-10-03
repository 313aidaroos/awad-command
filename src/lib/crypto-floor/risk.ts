/**
 * Hard risk limits for the riskier paper floor (2026-10-02). PURE. Code + owner only: agents, desk leads, the daily
 * review and the lab can NOT loosen anything here. Strategy params (crypto_floor_desks.params, the only thing the lab
 * and the review can write) never contain these keys: validateParams rejects them and effectiveParams ignores them.
 *
 * 1. Desk daily loss cap: when a desk's day P&L (all asset classes, marked to market) reaches the cap, the desk opens
 *    nothing new until the next UTC day. Exits and stops keep running. Owner override: crypto_floor_desks.risk.dayLossPct,
 *    accepted only inside DESK_DAY_LOSS_CAP bounds (anything else → default).
 * 2. Options max loss per position: long premium only, so max loss = limit premium × 100 × contracts. Sizing never
 *    exceeds the cap. Owner override: risk.optionMaxLossUsd inside OPTION_MAX_LOSS bounds.
 * 3. Floor throughput: orders per tick and open positions, with higher riskier-floor minimums and hard ceilings.
 */
import { OPTION_MULTIPLIER, optionLimitPrice } from "./assets";
import type { DeskRow, FloorParamsRow } from "./types";

export const DESK_DAY_LOSS_CAP = { defaultPct: -4, loosestPct: -10, tightestPct: -0.5 } as const;
export const OPTION_MAX_LOSS = { defaultUsd: 250, minUsd: 25, maxUsd: 1000 } as const;
export const FLOOR_LIMITS = { ordersPerTick: 10, ordersPerTickHardMax: 20, openPositions: 30, openPositionsHardMax: 50 } as const;

/** Keys no agent / lab / review write may ever carry in strategy params (they would be ignored anyway). */
export const OWNER_ONLY_RISK_KEYS = ["dayLossPct", "dayLossCapPct", "dailyLossCapPct", "optionMaxLossUsd", "halt_day_loss_pct", "maxLossUsd"] as const;

/** The desk's hard daily loss cap (% of start-of-day equity, negative). Reads ONLY the owner-set risk column. */
export function deskDailyLossCap(desk: Pick<DeskRow, "risk">): number {
  const v = Number(desk.risk?.dayLossPct);
  return Number.isFinite(v) && v <= DESK_DAY_LOSS_CAP.tightestPct && v >= DESK_DAY_LOSS_CAP.loosestPct ? v : DESK_DAY_LOSS_CAP.defaultPct;
}

/** Max loss (USD) for one options position on this desk. Reads ONLY the owner-set risk column. */
export function optionMaxLossUsd(desk: Pick<DeskRow, "risk">): number {
  const v = Number(desk.risk?.optionMaxLossUsd);
  return Number.isFinite(v) && v >= OPTION_MAX_LOSS.minUsd && v <= OPTION_MAX_LOSS.maxUsd ? v : OPTION_MAX_LOSS.defaultUsd;
}

/** Is the desk at (or past) its cap today? */
export function atLossCap(dayPnlPct: number, capPct: number): boolean {
  return Number.isFinite(dayPnlPct) && dayPnlPct <= capPct;
}

export type OptionSizing =
  | { ok: true; qty: number; limitPrice: number; maxLossUsd: number }
  | { ok: false; reason: string };

/**
 * Long call/put sizing. Whole contracts; limit = ask rounded UP to the option tick, so the real max loss
 * (limit × 100 × qty) is what is checked. Never exceeds `maxLossUsd`.
 */
export function sizeLongOption(ask: number, maxLossUsd: number, budgetUsd = Number.POSITIVE_INFINITY): OptionSizing {
  if (!(ask > 0) || !Number.isFinite(ask)) return { ok: false, reason: "No ask quote for the contract" };
  const limitPrice = optionLimitPrice("buy", ask);
  const perContract = limitPrice * OPTION_MULTIPLIER;
  const cap = Math.min(maxLossUsd, budgetUsd);
  const qty = Math.floor(cap / perContract + 1e-9);
  if (qty < 1) return { ok: false, reason: `One contract costs $${perContract.toFixed(2)}, above the $${cap.toFixed(2)} max loss per options position` };
  const maxLoss = qty * perContract;
  if (maxLoss > maxLossUsd + 1e-6) return { ok: false, reason: "Sizing would exceed the options max loss" }; // defensive, unreachable
  return { ok: true, qty, limitPrice, maxLossUsd: maxLoss };
}

/** Floor throughput limits: DB values act as a minimum of the riskier defaults, never above the hard ceilings. */
export function effectiveFloorLimits(params: Pick<FloorParamsRow, "max_orders_per_tick" | "max_open_positions_total">) {
  const n = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
  return {
    maxOrdersPerTick: Math.min(FLOOR_LIMITS.ordersPerTickHardMax, Math.max(FLOOR_LIMITS.ordersPerTick, n(params.max_orders_per_tick, 0))),
    maxOpenPositions: Math.min(FLOOR_LIMITS.openPositionsHardMax, Math.max(FLOOR_LIMITS.openPositions, n(params.max_open_positions_total, 0))),
  };
}

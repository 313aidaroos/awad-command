/**
 * Asset classes and US-equity sessions for the Crypto Floor (2026-10-02 riskier floor). PURE.
 *
 * - crypto ("BTC/USD"): trades 24/7. Market order, time_in_force gtc (Alpaca rejects "day" for crypto).
 * - stock ("NVDA"): regular hours (09:30–16:00 ET) market/day; extended hours (04:00–09:30, 16:00–20:00 ET)
 *   LIMIT + time_in_force day + extended_hours (Alpaca only accepts limit/day orders outside regular hours), whole shares.
 * - option (OCC "AAPL261023C00340000"): REGULAR HOURS ONLY (Alpaca rule). Long premium only, limit/day, whole contracts.
 *   The ledger values options per contract (premium × 100), so qty × price is dollars for every asset class.
 */

export type AssetClass = "crypto" | "stock" | "option";
export type Session = "regular" | "extended" | "closed";

/** Stocks the floor may trade (its own new positions only). Liquid names with extended-hours volume. */
export const STOCK_UNIVERSE = ["SPY", "QQQ", "NVDA", "TSLA", "AAPL", "AMD", "META", "MSFT", "AMZN", "COIN", "MSTR", "PLTR"] as const;

/** Underlyings ORBIT's options lane may buy calls/puts on (liquid chains, penny-wide quotes). */
export const OPTION_UNDERLYINGS = ["SPY", "QQQ", "NVDA", "TSLA", "AAPL"] as const;

export const OPTION_MULTIPLIER = 100;

const OCC = /^([A-Z]{1,6})(\d{2})(\d{2})(\d{2})([CP])(\d{8})$/;

export function isOptionSymbol(symbol: string): boolean {
  return OCC.test(symbol);
}

export function assetClass(symbol: string): AssetClass {
  if (symbol.includes("/")) return "crypto";
  if (isOptionSymbol(symbol)) return "option";
  return "stock";
}

export type OccParts = { underlying: string; expiration: string; right: "call" | "put"; strike: number };

/** "AAPL261023C00340000" → AAPL, 2026-10-23, call, 340. null when not an OCC symbol. */
export function parseOcc(symbol: string): OccParts | null {
  const m = OCC.exec(symbol);
  if (!m) return null;
  return { underlying: m[1], expiration: `20${m[2]}-${m[3]}-${m[4]}`, right: m[5] === "C" ? "call" : "put", strike: Number(m[6]) / 1000 };
}

/** Days from `now` to the option's expiration (16:00 ET ≈ 20:00/21:00 UTC; 20:00 UTC used). */
export function daysToExpiry(symbol: string, now: number): number | null {
  const p = parseOcc(symbol);
  if (!p) return null;
  return (Date.parse(`${p.expiration}T20:00:00Z`) - now) / 86_400_000;
}

/** Ledger price per unit: options per contract (premium × 100); everything else as quoted. */
export function contractMultiplier(symbol: string): number {
  return assetClass(symbol) === "option" ? OPTION_MULTIPLIER : 1;
}

const etFmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** US equity session at `now` by the clock (weekends closed; exchange holidays come from Alpaca's clock in tick.ts). */
export function marketSession(now: number): Session {
  const parts = Object.fromEntries(etFmt.formatToParts(new Date(now)).map((p) => [p.type, p.value]));
  if (parts.weekday === "Sat" || parts.weekday === "Sun") return "closed";
  const mins = Number(parts.hour) * 60 + Number(parts.minute);
  if (mins >= 9 * 60 + 30 && mins < 16 * 60) return "regular";
  if (mins >= 4 * 60 && mins < 20 * 60) return "extended";
  return "closed";
}

/** Combine the clock-based session with Alpaca's market clock (is_open = regular session today). */
export function sessionWithClock(now: number, clockIsOpen: boolean | null): Session {
  const s = marketSession(now);
  if (clockIsOpen === null) return s;
  if (clockIsOpen) return "regular";
  return s === "regular" ? "closed" : s; // weekday regular hours but the exchange is shut (holiday)
}

export type OrderShape = { orderType: "market" | "limit"; timeInForce: "gtc" | "day"; extendedHours: boolean; wholeUnits: boolean };

/**
 * May this asset class trade now, and with what order shape? null = not allowed (with the reason).
 * Crypto: always. Stocks: regular (market/day) or extended (limit/day/extended_hours). Options: regular only.
 */
export function orderShape(asset: AssetClass, session: Session): { ok: true; shape: OrderShape } | { ok: false; reason: string } {
  if (asset === "crypto") return { ok: true, shape: { orderType: "market", timeInForce: "gtc", extendedHours: false, wholeUnits: false } };
  if (asset === "stock") {
    if (session === "regular") return { ok: true, shape: { orderType: "market", timeInForce: "day", extendedHours: false, wholeUnits: false } };
    if (session === "extended") return { ok: true, shape: { orderType: "limit", timeInForce: "day", extendedHours: true, wholeUnits: true } };
    return { ok: false, reason: "US stock market closed (no regular or extended session)" };
  }
  if (session === "regular") return { ok: true, shape: { orderType: "limit", timeInForce: "day", extendedHours: false, wholeUnits: true } };
  return { ok: false, reason: "Options trade in regular hours only" };
}

/** Extended-hours limit price: marketable but bounded (buy ≤ +0.5%, sell ≥ −0.5% of the reference). */
export const EXTENDED_LIMIT_BAND = 0.005;

export function extendedLimitPrice(side: "buy" | "sell", ref: number): number {
  const raw = side === "buy" ? ref * (1 + EXTENDED_LIMIT_BAND) : ref * (1 - EXTENDED_LIMIT_BAND);
  return ref >= 1 ? Number(raw.toFixed(2)) : Number(raw.toFixed(4));
}

/** Option premium tick: $0.01 under $3, $0.05 at/above (rounded UP for buys so max loss uses the real limit). */
export function optionLimitPrice(side: "buy" | "sell", premium: number): number {
  const tick = premium < 3 ? 0.01 : 0.05;
  const steps = side === "buy" ? Math.ceil(premium / tick - 1e-9) : Math.floor(premium / tick + 1e-9);
  return Number((Math.max(1, steps) * tick).toFixed(2));
}

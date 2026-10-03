import {
  ALPACA_DATA_ORIGIN,
  ALPACA_PAPER_ORIGIN,
  assertAlpacaDataBase,
  assertAlpacaPaperBase,
} from "@/crypto-floor/paper/guard";
import { normalizePair } from "./market";
import type { Bar } from "./types";

/**
 * Alpaca client for the Crypto Floor robot. Paper trading origin only (guard.ts refuses live hosts).
 *
 * Keys (2026-10-02): the floor's OWN paper account ONLY — CRYPTO_FLOOR_ALPACA_API_KEY / CRYPTO_FLOOR_ALPACA_SECRET_KEY.
 * There is NO fallback to AwadBot's ALPACA_API_KEY / ALPACA_SECRET_KEY (sharing that account let AwadBot's flatten
 * sell the floor's PEPE). Missing keys → floorAlpacaConfig() returns null and the floor runs in the reported
 * "no own account" state: no broker calls, no trading, a clear banner in the UI, health and the daily email.
 */

export const FLOOR_KEY_ENV = ["CRYPTO_FLOOR_ALPACA_API_KEY", "CRYPTO_FLOOR_ALPACA_SECRET_KEY"] as const;
export const NO_OWN_ACCOUNT_MESSAGE =
  "No own Alpaca paper account: CRYPTO_FLOOR_ALPACA_API_KEY / CRYPTO_FLOOR_ALPACA_SECRET_KEY are not set. The floor is not trading (no fallback to AwadBot's keys).";

export type AlpacaConfig = {
  keyId: string;
  secret: string;
  tradeBase: string;
  dataBase: string;
  /** Always true now: the floor only ever runs on its own paper account. Kept for the heartbeat/UI field. */
  dedicated: boolean;
};

/** The floor's own paper-account config, or null when its keys are missing. Never reads ALPACA_API_KEY / ALPACA_SECRET_KEY. */
export function floorAlpacaConfig(env: NodeJS.ProcessEnv = process.env): AlpacaConfig | null {
  const keyId = env.CRYPTO_FLOOR_ALPACA_API_KEY?.trim();
  const secret = env.CRYPTO_FLOOR_ALPACA_SECRET_KEY?.trim();
  if (!keyId || !secret) return null;
  return {
    keyId,
    secret,
    tradeBase: assertAlpacaPaperBase(env.ALPACA_PAPER_BASE_URL || ALPACA_PAPER_ORIGIN),
    dataBase: assertAlpacaDataBase(ALPACA_DATA_ORIGIN),
    dedicated: true,
  };
}

/** Which of the floor's key env vars are missing (names only, never values). */
export function missingFloorKeys(env: NodeJS.ProcessEnv = process.env): string[] {
  return FLOOR_KEY_ENV.filter((k) => !env[k]?.trim());
}

export type AlpacaAccount = {
  cash: string;
  equity: string;
  portfolio_value: string;
  buying_power?: string;
  non_marginable_buying_power?: string;
  options_buying_power?: string;
  status?: string;
};

export type OptionSnapshot = { symbol: string; bid: number; ask: number; mid: number | null };

export type AlpacaPosition = {
  symbol: string;
  qty: string;
  qty_available?: string;
  avg_entry_price: string;
  current_price: string;
  market_value?: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  asset_class?: string;
  side?: "long" | "short";
};

export type AlpacaOrder = {
  id: string;
  client_order_id: string;
  symbol: string;
  side: "buy" | "sell";
  qty: string | null;
  filled_qty: string;
  filled_avg_price: string | null;
  filled_at: string | null;
  status: string;
  created_at?: string;
};

type BarWire = { t: string; o: number; h: number; l: number; c: number; v: number };

export class AlpacaHttpError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`Alpaca HTTP ${status}: ${body.slice(0, 300)}`);
    this.name = "AlpacaHttpError";
  }
}

export class AlpacaClient {
  constructor(
    private cfg: AlpacaConfig,
    private fetcher: typeof fetch = fetch,
    private timeoutMs = 10_000,
  ) {}

  get dedicated() {
    return this.cfg.dedicated;
  }

  private async request<T>(base: string, path: string, init: RequestInit = {}): Promise<T> {
    const res = await this.fetcher(`${base}${path}`, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(this.timeoutMs),
      headers: {
        ...init.headers,
        "APCA-API-KEY-ID": this.cfg.keyId,
        "APCA-API-SECRET-KEY": this.cfg.secret,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
    });
    const text = await res.text();
    if (!res.ok) throw new AlpacaHttpError(res.status, text);
    return (text ? JSON.parse(text) : null) as T;
  }

  account() {
    return this.request<AlpacaAccount>(this.cfg.tradeBase, "/v2/account");
  }

  private assetCache: Promise<Map<string, CryptoAssetRule> | null> | null = null;

  /** Crypto pairs Alpaca lists (tradable flag, minimum size, quantity increment). Fetched once per client; null on error. */
  cryptoAssets(): Promise<Map<string, CryptoAssetRule> | null> {
    this.assetCache ??= this.request<Array<{ symbol: string; tradable?: boolean; status?: string; min_order_size?: string | number; min_trade_increment?: string | number }>>(
      this.cfg.tradeBase,
      "/v2/assets?asset_class=crypto&status=active",
    )
      .then((rows) => {
        const out = new Map<string, CryptoAssetRule>();
        for (const r of rows ?? []) {
          if (!r.symbol?.includes("/") || !r.symbol.endsWith("/USD")) continue;
          out.set(normalizePair(r.symbol), { tradable: r.tradable !== false, minOrderSize: Number(r.min_order_size ?? 0) || 0, minTradeIncrement: Number(r.min_trade_increment ?? 0) || 0 });
        }
        return out.size ? out : null;
      })
      .catch(() => null);
    return this.assetCache;
  }

  /** Drop pairs Alpaca does not list (asking for an unknown pair can fail the whole data request). */
  async listedPairs(symbols: string[]): Promise<string[]> {
    const assets = await this.cryptoAssets();
    return assets ? symbols.filter((s) => assets.get(normalizePair(s))?.tradable) : symbols;
  }

  positions() {
    return this.request<AlpacaPosition[]>(this.cfg.tradeBase, "/v2/positions");
  }

  /**
   * Hourly (or other) bars for several pairs from `start` to now, oldest first, all pages.
   * `start` is required: without it Alpaca defaults to the beginning of the current day, which is why
   * the v1 robot read the 00:00 and 01:00 UTC bars all day long.
   */
  async bars(symbols: string[], start: Date, timeframe = "1Hour"): Promise<Map<string, Bar[]>> {
    const out = new Map<string, Bar[]>(symbols.map((s) => [normalizePair(s), []]));
    symbols = await this.listedPairs(symbols);
    if (!symbols.length) return out;
    let pageToken: string | null = null;
    for (let page = 0; page < 20; page++) {
      const q = new URLSearchParams({
        symbols: symbols.map(normalizePair).join(","),
        timeframe,
        start: start.toISOString(),
        limit: "10000",
        sort: "asc",
      });
      if (pageToken) q.set("page_token", pageToken);
      const body: { bars?: Record<string, BarWire[]>; next_page_token?: string | null } =
        await this.request(this.cfg.dataBase, `/v1beta3/crypto/us/bars?${q}`);
      for (const [wireSymbol, rows] of Object.entries(body.bars ?? {})) {
        const symbol = normalizePair(wireSymbol);
        const list = out.get(symbol) ?? [];
        for (const b of rows) {
          list.push({ symbol, timestamp: b.t, open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v });
        }
        out.set(symbol, list);
      }
      pageToken = body.next_page_token ?? null;
      if (!pageToken) break;
    }
    return out;
  }

  async latestTrades(symbols: string[]): Promise<Map<string, { price: number; at: string }>> {
    symbols = await this.listedPairs(symbols);
    if (!symbols.length) return new Map();
    const q = new URLSearchParams({ symbols: symbols.map(normalizePair).join(",") });
    const body: { trades?: Record<string, { p: number; t: string }> } = await this.request(
      this.cfg.dataBase,
      `/v1beta3/crypto/us/latest/trades?${q}`,
    );
    const out = new Map<string, { price: number; at: string }>();
    for (const [wireSymbol, t] of Object.entries(body.trades ?? {})) {
      if (Number.isFinite(t.p) && t.p > 0) out.set(normalizePair(wireSymbol), { price: t.p, at: t.t });
    }
    return out;
  }

  /**
   * Submit an order. Defaults to a crypto market order (crypto accepts only gtc/ioc; "day" is rejected).
   * Stocks: market/day in regular hours; limit/day + extended_hours outside. Options: limit or market, day only.
   */
  submitOrder(input: {
    symbol: string;
    qty: string;
    side: "buy" | "sell";
    clientOrderId: string;
    notional?: string;
    type?: "market" | "limit";
    timeInForce?: "gtc" | "day";
    limitPrice?: number;
    extendedHours?: boolean;
  }) {
    const isCrypto = input.symbol.includes("/");
    const type = input.type ?? "market";
    return this.request<AlpacaOrder>(this.cfg.tradeBase, "/v2/orders", {
      method: "POST",
      body: JSON.stringify({
        symbol: isCrypto ? normalizePair(input.symbol) : input.symbol,
        ...(input.notional ? { notional: input.notional } : { qty: input.qty }),
        side: input.side,
        type,
        time_in_force: input.timeInForce ?? (isCrypto ? "gtc" : "day"),
        ...(type === "limit" && input.limitPrice ? { limit_price: String(input.limitPrice) } : {}),
        ...(input.extendedHours ? { extended_hours: true } : {}),
        client_order_id: input.clientOrderId,
      }),
    });
  }

  /** Alpaca market clock (is_open = US regular session right now). */
  clock() {
    return this.request<{ is_open: boolean; next_open?: string; next_close?: string; timestamp?: string }>(this.cfg.tradeBase, "/v2/clock");
  }

  /** Hourly (or other) stock bars, IEX feed (works on free paper accounts), oldest first, all pages. */
  async stockBars(symbols: string[], start: Date, timeframe = "1Hour"): Promise<Map<string, Bar[]>> {
    const out = new Map<string, Bar[]>(symbols.map((s) => [s, []]));
    if (!symbols.length) return out;
    let pageToken: string | null = null;
    for (let page = 0; page < 20; page++) {
      const q = new URLSearchParams({ symbols: symbols.join(","), timeframe, start: start.toISOString(), limit: "10000", sort: "asc", feed: "iex", adjustment: "raw" });
      if (pageToken) q.set("page_token", pageToken);
      const body: { bars?: Record<string, BarWire[]>; next_page_token?: string | null } = await this.request(this.cfg.dataBase, `/v2/stocks/bars?${q}`);
      for (const [symbol, rows] of Object.entries(body.bars ?? {})) {
        const list = out.get(symbol) ?? [];
        for (const b of rows) list.push({ symbol, timestamp: b.t, open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v });
        out.set(symbol, list);
      }
      pageToken = body.next_page_token ?? null;
      if (!pageToken) break;
    }
    return out;
  }

  async latestStockTrades(symbols: string[]): Promise<Map<string, { price: number; at: string }>> {
    if (!symbols.length) return new Map();
    const q = new URLSearchParams({ symbols: symbols.join(","), feed: "iex" });
    const body: { trades?: Record<string, { p: number; t: string }> } = await this.request(this.cfg.dataBase, `/v2/stocks/trades/latest?${q}`);
    const out = new Map<string, { price: number; at: string }>();
    for (const [symbol, t] of Object.entries(body.trades ?? {})) if (Number.isFinite(t.p) && t.p > 0) out.set(symbol, { price: t.p, at: t.t });
    return out;
  }

  /** Option chain snapshots for one underlying (calls+puts near the money, an expiry window). Indicative feed. */
  async optionChain(underlying: string, opts: { expirationGte: string; expirationLte: string; strikeGte: number; strikeLte: number }): Promise<OptionSnapshot[]> {
    const q = new URLSearchParams({
      feed: "indicative",
      limit: "250",
      expiration_date_gte: opts.expirationGte,
      expiration_date_lte: opts.expirationLte,
      strike_price_gte: String(opts.strikeGte),
      strike_price_lte: String(opts.strikeLte),
    });
    const body: { snapshots?: Record<string, { latestQuote?: { bp?: number; ap?: number } }> } = await this.request(this.cfg.dataBase, `/v1beta1/options/snapshots/${encodeURIComponent(underlying)}?${q}`);
    return snapshotList(body.snapshots ?? {});
  }

  /** Quotes for specific option contracts (held positions), keyed by OCC symbol. */
  async optionSnapshots(symbols: string[]): Promise<Map<string, OptionSnapshot>> {
    if (!symbols.length) return new Map();
    const q = new URLSearchParams({ symbols: symbols.join(","), feed: "indicative" });
    const body: { snapshots?: Record<string, { latestQuote?: { bp?: number; ap?: number } }> } = await this.request(this.cfg.dataBase, `/v1beta1/options/snapshots?${q}`);
    return new Map(snapshotList(body.snapshots ?? {}).map((s) => [s.symbol, s]));
  }

  /** null when Alpaca has no order with this client_order_id. */
  async orderByClientId(clientOrderId: string): Promise<AlpacaOrder | null> {
    try {
      return await this.request<AlpacaOrder>(
        this.cfg.tradeBase,
        `/v2/orders:by_client_order_id?${new URLSearchParams({ client_order_id: clientOrderId })}`,
      );
    } catch (err) {
      if (err instanceof AlpacaHttpError && err.status === 404) return null;
      throw err;
    }
  }

  async cancelOrder(alpacaOrderId: string): Promise<void> {
    await this.request(this.cfg.tradeBase, `/v2/orders/${encodeURIComponent(alpacaOrderId)}`, {
      method: "DELETE",
    });
  }
}

function snapshotList(raw: Record<string, { latestQuote?: { bp?: number; ap?: number } }>): OptionSnapshot[] {
  return Object.entries(raw).map(([symbol, v]) => {
    const bid = Number(v.latestQuote?.bp ?? 0) || 0;
    const ask = Number(v.latestQuote?.ap ?? 0) || 0;
    return { symbol, bid, ask, mid: bid > 0 && ask > 0 ? (bid + ask) / 2 : null };
  });
}

/** Format a crypto quantity for Alpaca: at most 9 decimals, always rounded down. */
export type CryptoAssetRule = { tradable: boolean; minOrderSize: number; minTradeIncrement: number };

/** Round a quantity down to Alpaca's increment for the pair (no-op when unknown). */
export function roundQty(qty: number, increment: number): number {
  if (!(increment > 0)) return qty;
  const decimals = Math.max(0, Math.min(9, Math.ceil(-Math.log10(increment) - 1e-9)));
  return Number((Math.floor(qty / increment + 1e-9) * increment).toFixed(decimals));
}

export function formatQty(qty: number): string {
  const floored = Math.floor(qty * 1e9) / 1e9;
  return floored.toFixed(9).replace(/0+$/, "").replace(/\.$/, "");
}

/** Map an Alpaca order status onto the floor's order status. */
export function mapAlpacaStatus(status: string): import("./types").OrderStatus {
  switch (status) {
    case "filled":
      return "filled";
    case "partially_filled":
      return "partially_filled";
    case "canceled":
    case "expired":
    case "done_for_day":
    case "replaced":
      return "canceled";
    case "rejected":
    case "suspended":
      return "rejected";
    default:
      return "submitted"; // new, accepted, pending_new, accepted_for_bidding, calculated, held…
  }
}

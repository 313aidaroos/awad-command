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
 * Keys: CRYPTO_FLOOR_ALPACA_API_KEY / CRYPTO_FLOOR_ALPACA_SECRET_KEY when set (a paper account of the
 * floor's own), otherwise the shared ALPACA_API_KEY / ALPACA_SECRET_KEY book that AwadBot also trades.
 */

export type AlpacaConfig = {
  keyId: string;
  secret: string;
  tradeBase: string;
  dataBase: string;
  /** true when the floor has its own paper account (not shared with AwadBot). */
  dedicated: boolean;
};

export function floorAlpacaConfig(env: NodeJS.ProcessEnv = process.env): AlpacaConfig | null {
  const dedicatedKey = env.CRYPTO_FLOOR_ALPACA_API_KEY?.trim();
  const dedicatedSecret = env.CRYPTO_FLOOR_ALPACA_SECRET_KEY?.trim();
  const dedicated = Boolean(dedicatedKey && dedicatedSecret);
  const keyId = dedicated ? dedicatedKey : env.ALPACA_API_KEY?.trim();
  const secret = dedicated ? dedicatedSecret : env.ALPACA_SECRET_KEY?.trim();
  if (!keyId || !secret) return null;
  return {
    keyId,
    secret,
    tradeBase: assertAlpacaPaperBase(env.ALPACA_PAPER_BASE_URL || ALPACA_PAPER_ORIGIN),
    dataBase: assertAlpacaDataBase(ALPACA_DATA_ORIGIN),
    dedicated,
  };
}

export type AlpacaAccount = {
  cash: string;
  equity: string;
  portfolio_value: string;
  buying_power?: string;
  non_marginable_buying_power?: string;
  status?: string;
};

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

  /** Crypto market order. Crypto accepts only gtc/ioc; "day" is rejected ("invalid crypto time_in_force"). */
  submitOrder(input: { symbol: string; qty: string; side: "buy" | "sell"; clientOrderId: string; notional?: string }) {
    return this.request<AlpacaOrder>(this.cfg.tradeBase, "/v2/orders", {
      method: "POST",
      body: JSON.stringify({
        symbol: normalizePair(input.symbol),
        ...(input.notional ? { notional: input.notional } : { qty: input.qty }),
        side: input.side,
        type: "market",
        time_in_force: "gtc",
        client_order_id: input.clientOrderId,
      }),
    });
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

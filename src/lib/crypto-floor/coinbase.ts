/**
 * Coinbase Advanced Trade client for the Crypto Floor. REAL MONEY venue — Coinbase has no paper trading
 * (its sandbox only returns fixed mock responses).
 *
 * Auth: a Coinbase Developer Platform (CDP) "Secret API key". Every request carries a fresh JWT
 * (2-minute expiry) signed with the key: ES256 for ECDSA keys (PEM), EdDSA for Ed25519 keys (base64).
 * Mirrors coinbase/coinbase-advanced-py jwt_generator.py: header {alg, kid, nonce, typ}, payload
 * {sub, iss: "cdp", nbf, exp, uri: "<METHOD> api.coinbase.com<path>"} (path without the query string).
 *
 * Env: COINBASE_API_KEY_NAME (the key name/id) + COINBASE_API_PRIVATE_KEY (PEM or base64 secret).
 * The key must have View + Trade and must NOT have Transfer — the robot refuses to trade with a key that can move money out.
 */
import { createHash, createPrivateKey, randomBytes, sign, type KeyObject } from "node:crypto";
import type { OrderStatus } from "./types";

export const COINBASE_HOST = "api.coinbase.com";
export const COINBASE_PREFIX = "/api/v3/brokerage";

export type CoinbaseConfig = { keyName: string; privateKey: string; host: string };

export function coinbaseConfig(env: NodeJS.ProcessEnv = process.env): CoinbaseConfig | null {
  const keyName = (env.COINBASE_API_KEY_NAME ?? env.COINBASE_API_KEY ?? "").trim();
  const privateKey = (env.COINBASE_API_PRIVATE_KEY ?? env.COINBASE_API_SECRET ?? "").trim();
  if (!keyName || !privateKey) return null;
  return { keyName, privateKey, host: COINBASE_HOST };
}

/** "BTC/USD" → "BTC-USD" */
export function toProductId(pair: string): string {
  return pair.trim().toUpperCase().replace("/", "-");
}

// ── JWT ──────────────────────────────────────────────────────────────────────

const ED25519_PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

export function loadCoinbaseKey(secret: string): { key: KeyObject; alg: "ES256" | "EdDSA" } {
  const s = secret.replace(/\\n/g, "\n").trim();
  if (s.startsWith("-----BEGIN")) {
    const key = createPrivateKey(s);
    if (key.asymmetricKeyType === "ec") return { key, alg: "ES256" };
    if (key.asymmetricKeyType === "ed25519") return { key, alg: "EdDSA" };
    throw new Error(`Unsupported Coinbase key type ${key.asymmetricKeyType}; expected ECDSA P-256 or Ed25519.`);
  }
  const raw = Buffer.from(s.replace(/\s+/g, ""), "base64");
  if (raw.length !== 32 && raw.length !== 64) {
    throw new Error("Coinbase private key is neither PEM nor a base64 Ed25519 key (32 or 64 bytes).");
  }
  const der = Buffer.concat([ED25519_PKCS8_PREFIX, raw.subarray(0, 32)]);
  return { key: createPrivateKey({ key: der, format: "der", type: "pkcs8" }), alg: "EdDSA" };
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

export function buildCoinbaseJwt(keyName: string, secret: string, uri: string, nowSec = Math.floor(Date.now() / 1000)): string {
  const { key, alg } = loadCoinbaseKey(secret);
  const header = { alg, kid: keyName, nonce: randomBytes(16).toString("hex"), typ: "JWT" };
  const payload = { sub: keyName, iss: "cdp", nbf: nowSec, exp: nowSec + 120, uri };
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature =
    alg === "ES256"
      ? sign("sha256", Buffer.from(input), { key, dsaEncoding: "ieee-p1363" })
      : sign(null, Buffer.from(input), key);
  return `${input}.${b64url(signature)}`;
}

// ── Wire types (fields the floor uses) ───────────────────────────────────────

export type CoinbaseKeyPermissions = { can_view?: boolean; can_trade?: boolean; can_transfer?: boolean; portfolio_uuid?: string; portfolio_type?: string };
type Amount = { value: string; currency: string };
export type CoinbaseAccount = { uuid: string; name?: string; currency: string; available_balance?: Amount; hold?: Amount; active?: boolean; type?: string };
export type CoinbaseOrder = {
  order_id: string;
  client_order_id?: string;
  product_id: string;
  side: "BUY" | "SELL";
  status: string;
  filled_size?: string;
  average_filled_price?: string;
  filled_value?: string;
  total_fees?: string;
  completion_percentage?: string;
  created_time?: string;
  last_fill_time?: string | null;
};
export type CoinbaseCreateOrderResponse = {
  success?: boolean;
  success_response?: { order_id: string; product_id?: string; side?: string; client_order_id?: string };
  error_response?: { error?: string; message?: string; error_details?: string; preview_failure_reason?: string; new_order_failure_reason?: string };
  failure_reason?: string;
  order_id?: string;
};
export type CoinbaseProduct = { product_id: string; base_increment?: string; quote_increment?: string; base_min_size?: string; quote_min_size?: string; price?: string; trading_disabled?: boolean; status?: string };

export class CoinbaseHttpError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`Coinbase HTTP ${status}: ${body.slice(0, 300)}`);
    this.name = "CoinbaseHttpError";
  }
}

export class CoinbaseClient {
  constructor(
    private cfg: CoinbaseConfig,
    private fetcher: typeof fetch = fetch,
    private timeoutMs = 10_000,
  ) {}

  private async request<T>(method: "GET" | "POST", path: string, opts: { query?: Record<string, string | string[] | undefined>; body?: unknown } = {}): Promise<T> {
    const fullPath = `${COINBASE_PREFIX}${path}`;
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(opts.query ?? {})) {
      if (v === undefined) continue;
      for (const item of Array.isArray(v) ? v : [v]) q.append(k, item);
    }
    const url = `https://${this.cfg.host}${fullPath}${q.size ? `?${q}` : ""}`;
    const jwt = buildCoinbaseJwt(this.cfg.keyName, this.cfg.privateKey, `${method} ${this.cfg.host}${fullPath}`);
    const res = await this.fetcher(url, {
      method,
      cache: "no-store",
      signal: AbortSignal.timeout(this.timeoutMs),
      headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json", Accept: "application/json" },
      ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
    });
    const text = await res.text();
    if (!res.ok) throw new CoinbaseHttpError(res.status, text);
    return (text ? JSON.parse(text) : {}) as T;
  }

  keyPermissions() {
    return this.request<CoinbaseKeyPermissions>("GET", "/key_permissions");
  }

  async accounts(): Promise<CoinbaseAccount[]> {
    const out: CoinbaseAccount[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 10; page++) {
      const r = await this.request<{ accounts?: CoinbaseAccount[]; has_next?: boolean; cursor?: string }>("GET", "/accounts", { query: { limit: "250", cursor } });
      out.push(...(r.accounts ?? []));
      if (!r.has_next || !r.cursor) break;
      cursor = r.cursor;
    }
    return out;
  }

  /** Mid price per product from the best bid/ask. */
  async bestBidAsk(productIds: string[]): Promise<Map<string, { bid: number; ask: number; mid: number; at: string | null }>> {
    const r = await this.request<{ pricebooks?: Array<{ product_id: string; bids?: Array<{ price: string }>; asks?: Array<{ price: string }>; time?: string }> }>("GET", "/best_bid_ask", {
      query: { product_ids: productIds },
    });
    const out = new Map<string, { bid: number; ask: number; mid: number; at: string | null }>();
    for (const b of r.pricebooks ?? []) {
      const bid = Number(b.bids?.[0]?.price);
      const ask = Number(b.asks?.[0]?.price);
      if (bid > 0 && ask > 0) out.set(b.product_id, { bid, ask, mid: (bid + ask) / 2, at: b.time ?? null });
    }
    return out;
  }

  product(productId: string) {
    return this.request<CoinbaseProduct>("GET", `/products/${encodeURIComponent(productId)}`);
  }

  /** Market order, immediate-or-cancel. Buys by USD amount (quote_size), sells by coin amount (base_size). */
  createMarketOrder(input: { productId: string; side: "BUY" | "SELL"; clientOrderId: string; quoteSize?: string; baseSize?: string }) {
    if (input.side === "BUY" ? !input.quoteSize : !input.baseSize) throw new Error("Market BUY needs quoteSize; SELL needs baseSize.");
    return this.request<CoinbaseCreateOrderResponse>("POST", "/orders", {
      body: {
        client_order_id: input.clientOrderId,
        product_id: input.productId,
        side: input.side,
        order_configuration: { market_market_ioc: input.side === "BUY" ? { quote_size: input.quoteSize } : { base_size: input.baseSize } },
      },
    });
  }

  async getOrder(orderId: string): Promise<CoinbaseOrder | null> {
    try {
      const r = await this.request<{ order?: CoinbaseOrder }>("GET", `/orders/historical/${encodeURIComponent(orderId)}`);
      return r.order ?? null;
    } catch (err) {
      if (err instanceof CoinbaseHttpError && err.status === 404) return null;
      throw err;
    }
  }

  /** Recent orders for products since a time (used to find an order by client_order_id after a timeout). */
  async listOrders(input: { productIds: string[]; startDate: string }): Promise<CoinbaseOrder[]> {
    const r = await this.request<{ orders?: CoinbaseOrder[] }>("GET", "/orders/historical/batch", {
      query: { product_ids: input.productIds, start_date: input.startDate, limit: "100" },
    });
    return r.orders ?? [];
  }
}

export function mapCoinbaseStatus(status: string, filledSize: number): OrderStatus {
  switch (status) {
    case "FILLED":
      return "filled";
    case "CANCELLED":
    case "EXPIRED":
      return filledSize > 0 ? "filled" : "canceled"; // IOC market orders end CANCELLED/EXPIRED after a partial fill
    case "FAILED":
      return "rejected";
    case "UNKNOWN_ORDER_STATUS":
      return "unknown";
    default:
      return "submitted"; // OPEN, PENDING, QUEUED, CANCEL_QUEUED
  }
}

/** Deterministic UUID (v4 layout) from a seed, so a retried tick reuses the same client_order_id. */
export function uuidFromSeed(seed: string): string {
  const h = createHashHex(seed);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${((parseInt(h[16], 16) & 0x3) | 0x8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function createHashHex(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

/** Round down to a product increment ("0.00000001"). */
export function floorToIncrement(value: number, increment: string | undefined): string {
  const inc = Number(increment);
  if (!(inc > 0)) return (Math.floor(value * 1e8) / 1e8).toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
  const decimals = Math.max(0, (increment ?? "").split(".")[1]?.replace(/0+$/, "").length ?? 0);
  const units = Math.floor(value / inc + 1e-9);
  return (units * inc).toFixed(decimals);
}

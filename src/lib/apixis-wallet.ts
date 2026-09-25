// Change note (Claude, Sep 2026): Wallet client (server only). See docs/LAUNCH_NOTES.md.
/**
 * Apixis Wallet — shared server-side client for sister sites.
 *
 * Copy this ONE file into your repo (lib/apixis-wallet.ts). Do not fork the logic.
 * Runs on the SERVER only (Route Handler / Server Action). Never import from a
 * client component: it reads WALLET_API_KEY, which must never reach a browser.
 *
 * Env (already set on every family Vercel project):
 *   WALLET_API_KEY          this site's own Wallet API key (`apx_live_…`, scoped to your app).
 *                           Legacy: the Wallet service key still works until the Wallet turns it off.
 *   APIXIS_WALLET_API_URL   https://apixis-wallet.vercel.app
 *
 * SDK version: 2 (2026-09-23). Replace older copies with this file.
 *
 * Rules this client enforces so you don't have to remember them:
 *   - Wallet is the single source of truth for what a user owns. Read entitlements
 *     from here; never author your own authoritative balance or ownership.
 *   - Every redeem = quote → reserve → (you provision) → capture, or release on ANY
 *     failure. `redeem()` does that dance for you and never leaves a hold dangling.
 *   - Identity is the verified EMAIL, not the uid (uids differ per Supabase project).
 *   - Idempotency keys are stable per attempt: retrying the same attempt is safe.
 *   - 402 is a normal outcome ("not enough Ixis"), not an error. Show a Buy Ixis link.
 *   - Never fake success. If the Wallet is unreachable, say so.
 */

const BASE = (process.env.APIXIS_WALLET_API_URL ?? "https://apixis-wallet.vercel.app").replace(/\/$/, "");
const KEY = process.env.WALLET_API_KEY ?? process.env.APIXIS_WALLET_API_KEY ?? "";

export type Quote = { quoteId: string; productKey: string; app: string; name: string; xp: number; usdEquivalent: number; expiresAt: string };
export type Reservation = { reservationId: string; status: "held"; productKey: string; app?: string; ixis: number };
export type ReservationStatus = {
  reservationId: string;
  /** held = open · expired = open past its hold time (will be released) · captured = charged · released = not charged */
  status: "held" | "expired" | "captured" | "released";
  app: string | null;
  productKey: string | null;
  ixis: number;
  holdExpiresAt: string | null;
  settledAt: string | null;
  receiptId: string | null;
};
export type Entitlement = {
  id: string;
  owner_id: string;
  app_slug: string;
  product_key: string;
  status: "active" | string;
  xp_price: number | null;
  renews_at: string | null;
  created_at: string;
};

export class WalletError extends Error {
  status: number;
  body?: unknown;
  /** Machine code from the Wallet, e.g. "insufficient_balance", "already_captured", "already_released", "conflict". */
  code?: string;
  // No parameter properties: sister sites run tests with node --experimental-strip-types,
  // which rejects that shorthand. Keep this file erasable-syntax only.
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
    const maybe = typeof body === "object" && body !== null ? (body as { code?: unknown }).code : undefined;
    this.code = typeof maybe === "string" ? maybe : undefined;
  }
  /** Customer has fewer Ixis than the product costs. Show "Buy Ixis". */
  get insufficient() { return this.status === 402; }
}

export function isWalletConfigured(): boolean {
  return KEY.length > 20;
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  if (!isWalletConfigured()) throw new WalletError(503, "Wallet not configured on this server (WALLET_API_KEY missing)");
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  let json: unknown = {};
  try { json = text ? JSON.parse(text) : {}; } catch { /* non-JSON error page */ }
  if (!res.ok) {
    const msg = typeof json === "object" && json !== null && typeof (json as { error?: unknown }).error === "string"
      ? (json as { error: string }).error
      : `Wallet ${res.status}`;
    throw new WalletError(res.status, msg, json);
  }
  return json as T;
}

/** Public price check. No auth needed. Use it to render prices from the one canonical catalog. */
export async function quote(productKey: string): Promise<Quote> {
  const res = await fetch(`${BASE}/api/v1/quotes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ productKey }),
    cache: "no-store",
  });
  if (!res.ok) throw new WalletError(res.status, `Unknown product ${productKey}`);
  return res.json();
}

/**
 * Put a hold on the customer's Ixis.
 * `ownerEmail` = the signed-in user's VERIFIED email from YOUR Supabase session (user.email),
 * never from the request body. Email is the family-wide identity: every site has its own
 * Supabase project, so uids differ per site and mean nothing to the Wallet.
 */
export async function reserve(ownerEmail: string, productKey: string, idempotencyKey: string): Promise<Reservation> {
  return call("POST", "/api/v1/reservations", { productKey, idempotencyKey, owner_email: ownerEmail });
}

export async function capture(reservationId: string) {
  return call<{ reservationId: string; status: "captured"; receiptId: string }>("POST", `/api/v1/reservations/${reservationId}/capture`);
}

/**
 * Give the held Ixis back. Throws WalletError 409 with code "already_captured" if the hold was
 * captured — the customer WAS charged, so keep their access.
 */
export async function release(reservationId: string) {
  return call<{ reservationId: string; status: "released" }>("POST", `/api/v1/reservations/${reservationId}/release`);
}

/** Where a hold stands. Use it to reconcile after a timeout or crash. */
export async function reservationStatus(reservationId: string): Promise<ReservationStatus> {
  return call<ReservationStatus>("GET", `/api/v1/reservations/${reservationId}`);
}

/** What this user owns on your app. Wallet writes these on capture; you only read. */
export async function entitlements(ownerEmail: string, app: string): Promise<Entitlement[]> {
  const r = await call<{ entitlements: Entitlement[] }>("GET", `/api/v1/entitlements?app=${encodeURIComponent(app)}&owner_email=${encodeURIComponent(ownerEmail)}`);
  return r.entitlements ?? [];
}

export async function hasEntitlement(ownerEmail: string, app: string, productKey: string): Promise<boolean> {
  const list = await entitlements(ownerEmail, app);
  return list.some((e) => e.product_key === productKey && e.status === "active");
}

/**
 * The whole redeem, done right:
 *   reserve → provision() → capture (retried once).
 *   provision() throws           → release, rethrow (nothing granted, nothing charged).
 *   capture fails after retry    → release: if the Wallet says "already_captured" the customer WAS
 *                                  charged → keep access, return ok. If the release succeeds the
 *                                  customer was NOT charged → unprovision(), rethrow.
 *                                  If even that is unknown (Wallet down) → rethrow WITHOUT
 *                                  unprovisioning; reconcile later with reservationStatus().
 * `provision` is YOUR side effect (create the subscription row, unlock the file, start the job).
 *
 * Returns { ok:true, receiptId } or { ok:false, insufficient:true } for the 402 case.
 */
export async function redeem<T>(opts: {
  /** user.email from YOUR Supabase session — the family-wide identity. Must be a verified email. */
  ownerEmail: string;
  productKey: string;
  idempotencyKey: string;
  provision: (reservation: Reservation) => Promise<T>;
  /**
   * Undo what provision() did. Called only when the Wallet confirms the customer was NOT charged
   * (capture failed and the hold was released). Every site that writes access in provision() should pass it.
   */
  unprovision?: (reservation: Reservation, result: T) => Promise<void>;
}): Promise<{ ok: true; receiptId: string; result: T } | { ok: false; insufficient: true; needed: number; message: string }> {
  let held: Reservation;
  try {
    held = await reserve(opts.ownerEmail, opts.productKey, opts.idempotencyKey);
  } catch (e) {
    if (e instanceof WalletError && e.insufficient) {
      const q = await quote(opts.productKey).catch(() => null);
      return { ok: false, insufficient: true, needed: q?.xp ?? 0, message: e.message };
    }
    throw e;
  }

  let result: T;
  try {
    result = await opts.provision(held);
  } catch (e) {
    await release(held.reservationId).catch(() => { /* already settled or wallet down; the hold expires on its own */ });
    throw e;
  }

  let captureError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const cap = await capture(held.reservationId);
      return { ok: true, receiptId: cap.receiptId, result };
    } catch (e) {
      captureError = e;
      // A definite answer (4xx) will not change on retry.
      if (e instanceof WalletError && e.status >= 400 && e.status < 500) break;
    }
  }

  try {
    await release(held.reservationId);
  } catch (e) {
    if (e instanceof WalletError && e.code === "already_captured") {
      // The capture went through; only its response was lost. Charged → keep access.
      const status = await reservationStatus(held.reservationId).catch(() => null);
      return { ok: true, receiptId: status?.receiptId ?? "", result };
    }
    console.error("wallet: capture and release both failed; access kept, reconcile with reservationStatus()", {
      reservationId: held.reservationId,
    });
    throw captureError;
  }
  // Released → the customer was not charged → take the access back.
  if (opts.unprovision) {
    await opts.unprovision(held, result).catch((u) => console.error("wallet unprovision failed", u));
  }
  throw captureError;
}

/** Where to send someone who needs more Ixis. Returns them to `returnUrl` after purchase. */
export function buyIxisUrl(product: string, returnUrl: string): string {
  const u = new URL(`${BASE}/buy`);
  u.searchParams.set("product", product);
  u.searchParams.set("return_url", returnUrl);
  return u.toString();
}

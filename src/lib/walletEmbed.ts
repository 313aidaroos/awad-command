// Change note (Claude, Sep 2026): Wallet embed URL helper. See docs/LAUNCH_NOTES.md.
/**
 * COMMAND → Apixis Wallet deep link.
 * Cash checkout and the Ixis ledger stay on Wallet. See docs/WALLET_EMBED.md.
 */

export const DEFAULT_WALLET_APP_URL = "https://apixis-wallet.vercel.app";
export const COMMAND_PROD_ORIGIN = "https://awad-command.vercel.app";
export const COMMAND_WALLET_PATH = "/wallet";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export type WalletBalanceView =
  | { available: true; ixis: number; currency: "Ixis" }
  | { available: false };

/** Browser origin of the Wallet app. Paths and queries on the env value are dropped. */
export function walletAppOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_WALLET_URL?.trim();
  if (!raw) return DEFAULT_WALLET_APP_URL;
  try {
    const url = new URL(raw);
    const local = LOCAL_HOSTS.has(url.hostname);
    if (url.protocol === "https:" || (url.protocol === "http:" && local)) {
      return url.origin;
    }
  } catch {
    /* ignore malformed env */
  }
  return DEFAULT_WALLET_APP_URL;
}

/** Production COMMAND, plus localhost. No other host may be a return target. */
export function isAllowedCommandOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.origin === COMMAND_PROD_ORIGIN) return true;
    if (
      (url.protocol === "http:" || url.protocol === "https:") &&
      LOCAL_HOSTS.has(url.hostname)
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Origin to send back from Wallet. A missing or foreign Host falls back to production
 * so a spoofed header cannot choose the redirect.
 */
export function commandOriginFromRequest(
  hostHeader: string | null,
  protoHeader: string | null,
): string {
  const host = hostHeader?.split(",")[0]?.trim() ?? "";
  if (!host) return COMMAND_PROD_ORIGIN;
  const forwarded = protoHeader?.split(",")[0]?.trim();
  const local =
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("[::1]");
  const proto = forwarded || (local ? "http" : "https");
  const candidate = `${proto}://${host}`;
  return isAllowedCommandOrigin(candidate) ? new URL(candidate).origin : COMMAND_PROD_ORIGIN;
}

/** Always `/wallet` on an allowlisted origin. Anything else falls back to production. */
export function commandWalletReturnUrl(commandOrigin: string): string {
  const origin = isAllowedCommandOrigin(commandOrigin)
    ? new URL(commandOrigin).origin
    : COMMAND_PROD_ORIGIN;
  return `${origin}${COMMAND_WALLET_PATH}`;
}

/** Buy Ixis / Wallet. Query is only `origin` and `return_url`. */
export function walletDeepLink(commandOrigin: string): string {
  const url = new URL(walletAppOrigin());
  url.pathname = "/";
  url.hash = "";
  const params = new URLSearchParams();
  params.set("origin", "command");
  params.set("return_url", commandWalletReturnUrl(commandOrigin));
  url.search = params.toString();
  return url.toString();
}

/** Accept a numeric available balance. Null, strings, and non-finite values are not a balance. */
export function parseWalletBalance(body: unknown): WalletBalanceView {
  if (!body || typeof body !== "object") return { available: false };
  const available = (body as { available?: unknown }).available;
  if (typeof available !== "number" || !Number.isFinite(available) || available < 0) {
    return { available: false };
  }
  return { available: true, ixis: available, currency: "Ixis" };
}

export async function readWalletBalance(
  accessToken: string | null | undefined,
): Promise<WalletBalanceView> {
  if (!accessToken) return { available: false };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${walletAppOrigin()}/api/v1/wallet`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) return { available: false };
    return parseWalletBalance(await res.json());
  } catch {
    return { available: false };
  } finally {
    clearTimeout(timer);
  }
}

/** Buy Ixis page on Wallet. Browser-safe: no keys. Wallet allowlists the return host. */
export function walletBuyUrl(commandOrigin: string): string {
  const url = new URL(walletAppOrigin());
  url.pathname = "/buy";
  url.search = new URLSearchParams({
    product: "command",
    return_url: commandWalletReturnUrl(commandOrigin),
  }).toString();
  return url.toString();
}

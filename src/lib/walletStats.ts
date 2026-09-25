// Change note (Claude, Sep 2026): New. Reads the Wallet summary; refuses non-HTTPS/foreign hosts. See docs/LAUNCH_NOTES.md.
import { z } from "zod";
import { DEFAULT_WALLET_APP_URL } from "@/lib/walletEmbed";

/**
 * Server only. Reads the owner business summary from Apixis Wallet
 * (GET /api/v1/admin/summary, Bearer WALLET_STATS_KEY). Read-only: the stats key cannot move money.
 * Never import from a client component.
 */

const Day = z.object({
  day: z.string(),
  cashInCents: z.number(),
  refundCents: z.number(),
  ixisSold: z.number(),
  ixisRedeemed: z.number(),
  purchases: z.number(),
  redemptions: z.number(),
});

export const WalletSummarySchema = z.object({
  generatedAt: z.string(),
  days: z.number(),
  since: z.string(),
  totals: z.object({
    cashInCents: z.number(),
    refundCents: z.number(),
    netCashCents: z.number(),
    ixisSold: z.number(),
    ixisRedeemed: z.number(),
    purchases: z.number(),
    redemptions: z.number(),
    rejected: z.number(),
  }),
  series: z.array(Day),
  byApp: z.array(
    z.object({ app: z.string(), ixisRedeemed: z.number(), redemptions: z.number() }),
  ),
  holdings: z.object({
    customers: z.number(),
    availableIxis: z.number(),
    reservedIxis: z.number(),
    liabilityUsd: z.number(),
  }),
  activeEntitlements: z.number().nullable(),
  recent: z.array(
    z.object({
      reference: z.string(),
      at: z.string(),
      type: z.string(),
      outcome: z.string(),
      app: z.string().nullable(),
      email: z.string().nullable(),
      product: z.string().nullable(),
      ixis: z.number().nullable(),
      cents: z.number().nullable(),
    }),
  ),
});

export type WalletSummary = z.infer<typeof WalletSummarySchema>;
export type WalletSummaryDay = z.infer<typeof Day>;
export type WalletSummaryResult =
  | { available: true; summary: WalletSummary }
  | { available: false; reason: string };

export const WALLET_RANGES = [7, 30, 90, 365] as const;

export function walletApiBase(env: Record<string, string | undefined> = process.env): string {
  const raw = (env.APIXIS_WALLET_API_URL ?? env.NEXT_PUBLIC_WALLET_URL ?? "").trim();
  try {
    const url = new URL(raw || DEFAULT_WALLET_APP_URL);
    if (url.protocol === "https:" || url.hostname === "localhost") return url.origin;
  } catch {
    /* fall through */
  }
  return DEFAULT_WALLET_APP_URL;
}

export function walletStatsKey(env: Record<string, string | undefined> = process.env): string | null {
  const key = (env.WALLET_STATS_KEY ?? "").trim();
  return key.length >= 32 ? key : null;
}

export async function fetchWalletSummary(
  days = 30,
  deps: { fetch?: typeof fetch; env?: Record<string, string | undefined> } = {},
): Promise<WalletSummaryResult> {
  const env = deps.env ?? process.env;
  const key = walletStatsKey(env);
  if (!key) {
    return {
      available: false,
      reason: "WALLET_STATS_KEY is not set (same value on Wallet and COMMAND).",
    };
  }
  const span = Math.min(365, Math.max(1, Math.floor(days)));
  try {
    const res = await (deps.fetch ?? fetch)(
      `${walletApiBase(env)}/api/v1/admin/summary?days=${span}`,
      {
        headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      },
    );
    if (res.status === 401) return { available: false, reason: "Wallet rejected WALLET_STATS_KEY (values differ)." };
    if (res.status === 404) return { available: false, reason: "Wallet summary endpoint not deployed yet." };
    if (res.status === 503) return { available: false, reason: "Wallet stats not configured on Wallet yet." };
    if (!res.ok) return { available: false, reason: `Wallet summary failed (${res.status}).` };
    const parsed = WalletSummarySchema.safeParse(await res.json());
    if (!parsed.success) return { available: false, reason: "Wallet summary had an unexpected shape." };
    return { available: true, summary: parsed.data };
  } catch (error) {
    const name = error instanceof Error ? error.name : "Error";
    return { available: false, reason: `Wallet unreachable (${name}).` };
  }
}

/** Compact facts for Cixy. No customer emails. */
export function walletFactsForCixy(result: WalletSummaryResult) {
  if (!result.available) return { available: false, reason: result.reason };
  const { summary } = result;
  const today = summary.series.at(-1);
  return {
    available: true,
    days: summary.days,
    cashInUsd: summary.totals.cashInCents / 100,
    refundsUsd: summary.totals.refundCents / 100,
    netCashUsd: summary.totals.netCashCents / 100,
    todayCashInUsd: today ? today.cashInCents / 100 : 0,
    ixisSold: summary.totals.ixisSold,
    ixisRedeemed: summary.totals.ixisRedeemed,
    purchases: summary.totals.purchases,
    redemptions: summary.totals.redemptions,
    topSites: summary.byApp.slice(0, 5),
    customersHoldingIxis: summary.holdings.customers,
    unspentIxis: summary.holdings.availableIxis,
    unspentIxisUsd: summary.holdings.liabilityUsd,
    activeSubscriptions: summary.activeEntitlements,
    note: "Ixis are closed-loop credits (100 Ixis = $1). Unspent Ixis are owed service, not profit. All sales final.",
  };
}

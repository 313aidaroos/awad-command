import { describe, expect, it, vi } from "vitest";
import { fetchWalletSummary, walletApiBase, walletFactsForCixy } from "@/lib/walletStats";
import { walletMissionView } from "@/lib/missionControl";
import { walletBuyUrl } from "@/lib/walletEmbed";

const KEY = "k".repeat(40);
const summary = {
  generatedAt: "2026-09-23T12:00:00Z",
  days: 2,
  since: "2026-09-22T00:00:00Z",
  totals: { cashInCents: 11000, refundCents: 1000, netCashCents: 10000, ixisSold: 11000, ixisRedeemed: 5000, purchases: 2, redemptions: 1, rejected: 0 },
  series: [
    { day: "2026-09-22", cashInCents: 1000, refundCents: 1000, ixisSold: 1000, ixisRedeemed: 0, purchases: 1, redemptions: 0 },
    { day: "2026-09-23", cashInCents: 10000, refundCents: 0, ixisSold: 10000, ixisRedeemed: 5000, purchases: 1, redemptions: 1 },
  ],
  byApp: [{ app: "renoxis", ixisRedeemed: 5000, redemptions: 1 }],
  holdings: { customers: 3, availableIxis: 6000, reservedIxis: 0, liabilityUsd: 60 },
  activeEntitlements: 1,
  recent: [{ reference: "APX-00000002", at: "2026-09-23T10:00:00Z", type: "purchase", outcome: "ok", app: "wallet", email: "a@b.co", product: null, ixis: 10000, cents: 10000 }],
};

describe("wallet stats client", () => {
  it("is not connected without a 32+ char key and never calls out", async () => {
    const fetcher = vi.fn();
    const r = await fetchWalletSummary(30, { env: { WALLET_STATS_KEY: "short" }, fetch: fetcher as never });
    expect(r.available).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("sends the bearer to the Wallet summary endpoint and parses it", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify(summary), { status: 200 }));
    const r = await fetchWalletSummary(999, { env: { WALLET_STATS_KEY: KEY }, fetch: fetcher as never });
    expect(r.available).toBe(true);
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://apixis-wallet.vercel.app/api/v1/admin/summary?days=365");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${KEY}`);
  });

  it("reports a key mismatch honestly", async () => {
    const fetcher = vi.fn(async () => new Response("{}", { status: 401 }));
    const r = await fetchWalletSummary(30, { env: { WALLET_STATS_KEY: KEY }, fetch: fetcher as never });
    expect(r).toMatchObject({ available: false, reason: expect.stringContaining("rejected") });
  });

  it("rejects a malformed body instead of showing wrong numbers", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ totals: 1 }), { status: 200 }));
    const r = await fetchWalletSummary(30, { env: { WALLET_STATS_KEY: KEY }, fetch: fetcher as never });
    expect(r.available).toBe(false);
  });

  it("only uses https (or localhost) Wallet origins", () => {
    expect(walletApiBase({ APIXIS_WALLET_API_URL: "http://evil.example" })).toBe("https://apixis-wallet.vercel.app");
    expect(walletApiBase({ APIXIS_WALLET_API_URL: "https://w.example/path" })).toBe("https://w.example");
  });

  it("maps to dollars for the dashboard and Cixy, without customer emails for Cixy", () => {
    const view = walletMissionView({ available: true, summary });
    expect(view).toMatchObject({ available: true, todayCashInUsd: 100, netCashUsd: 100, dailyNetUsd: [0, 100], unspentIxisUsd: 60 });
    const facts = walletFactsForCixy({ available: true, summary });
    expect(JSON.stringify(facts)).not.toContain("a@b.co");
    expect(facts).toMatchObject({ netCashUsd: 100, unspentIxis: 6000 });
  });

  it("builds a browser-safe Buy Ixis link back to /wallet", () => {
    expect(walletBuyUrl("https://awad-command.vercel.app")).toBe(
      "https://apixis-wallet.vercel.app/buy?product=command&return_url=https%3A%2F%2Fawad-command.vercel.app%2Fwallet",
    );
  });
});

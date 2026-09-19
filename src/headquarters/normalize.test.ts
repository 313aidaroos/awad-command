import { describe, it, expect, vi } from "vitest";
import { parseFeed, normalizeCandles, summarizeLedger } from "./normalize";
import { readNotebook } from "./notebook";
describe("headquarters data boundaries", () => {
  it("accepts safe RSS links and decodes titles", () => {
    expect(
      parseFeed(
        "<item><title><![CDATA[A &amp; B]]></title><link>https://example.com/a</link></item><item><title>Bad</title><link>javascript:alert(1)</link></item>",
        "Source",
      ),
    ).toEqual([
      {
        title: "A & B",
        url: "https://example.com/a",
        publishedAt: null,
        source: "Source",
      },
    ]);
  });
  it("rejects malformed candles and sorts valid data", () => {
    expect(
      normalizeCandles([
        [2, 10, 20, 12, 18, 4],
        [1, 10, 20, 12, 18, 4],
        [2, 10, 20, 12, 18, 4],
        [3, 10, 20, 30, 18, 4],
        [4, 10, 20, 12, 18, Infinity],
      ]),
    ).toHaveLength(2);
    expect(
      normalizeCandles([
        [2, 10, 20, 12, 18, 4],
        [1, 10, 20, 12, 18, 4],
      ])[0].time,
    ).toBe(1);
  });
  it("separates currencies and counts only the requested UTC period", () => {
    const result = summarizeLedger(
      [
        { created_at: "2026-09-18", amount: 100, currency: "USD" },
        { created_at: "2026-09-18", amount: 500, currency: "eur" },
        { created_at: "2026-08-01", amount: 100, currency: "usd" },
      ],
      [
        { created_at: "2026-09-18", amount: 20, payload: { currency: "usd" } },
        { created_at: "2026-09-18", amount: 30 },
      ],
      7,
      new Date("2026-09-18T15:00:00Z"),
    );
    expect(result.revenue).toBe(100);
    expect(result.expenses).toBe(20);
    expect(result.net).toBe(80);
    expect(result.excludedCurrencies).toBe(2);
  });
  it("discards invalid personal storage", () => {
    expect(readNotebook("bad")).toEqual([]);
    expect(readNotebook('[{"title":"malformed"}]')).toEqual([]);
  });
});
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(async () => null),
}));
vi.mock("@/lib/supabase/service", () => ({ createServiceSupabase: vi.fn() }));
it("denies private operations before opening the service client", async () => {
  const { GET } = await import("@/app/api/headquarters/operations/route");
  const { createServiceSupabase } = await import("@/lib/supabase/service");
  const response = await GET();
  expect(response.status).toBe(401);
  expect(createServiceSupabase).not.toHaveBeenCalled();
});

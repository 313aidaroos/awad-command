import { NextResponse } from "next/server";
import { normalizeCandles, parseFeed } from "@/headquarters/normalize";
export const runtime = "nodejs";
const sources = {
  world: "https://feeds.bbci.co.uk/news/world/rss.xml",
  crypto: "https://www.coindesk.com/arc/outboundfeeds/rss/",
};
async function read(url: string) {
  const res = await fetch(url, {
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(8000),
    headers: { "User-Agent": "AWADCommand/1.0" },
  });
  if (!res.ok) throw new Error("Source unavailable");
  return res.text();
}
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const product = query.get("product") ?? "BTC-USD",
    granularity = Number(query.get("granularity") ?? 3600);
  if (
    !["BTC-USD", "ETH-USD", "SOL-USD"].includes(product) ||
    ![900, 3600, 86400].includes(granularity)
  )
    return NextResponse.json(
      { error: "Invalid market selection" },
      { status: 400 },
    );
  const results = await Promise.allSettled([
    read(sources.world),
    read(sources.crypto),
    read(
      `https://api.exchange.coinbase.com/products/${product}/candles?granularity=${granularity}`,
    ),
  ]);
  const errors: string[] = [];
  const world =
    results[0].status === "fulfilled"
      ? parseFeed(results[0].value, "BBC World")
      : [];
  const crypto =
    results[1].status === "fulfilled"
      ? parseFeed(results[1].value, "CoinDesk")
      : [];
  let candles: ReturnType<typeof normalizeCandles> = [];
  if (results[2].status === "fulfilled") {
    try {
      candles = normalizeCandles(JSON.parse(results[2].value));
    } catch {}
  }
  if (!world.length) errors.push("World news unavailable");
  if (!crypto.length) errors.push("Crypto news unavailable");
  if (!candles.length) errors.push("Market data unavailable");
  return NextResponse.json(
    {
      checkedAt: new Date().toISOString(),
      world,
      crypto,
      candles,
      product,
      granularity,
      errors,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}

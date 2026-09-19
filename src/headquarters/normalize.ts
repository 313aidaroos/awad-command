import type { Candle, NewsItem, FinancePoint } from "./types";
function plain(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (_, code: string) => {
      const n =
        code[0].toLowerCase() === "x"
          ? parseInt(code.slice(1), 16)
          : Number(code);
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "";
    })
    .replace(
      /&(amp|lt|gt|quot|apos);/g,
      (_, x: string) =>
        ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" })[x] ?? "",
    )
    .trim();
}
export function parseFeed(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = [];
  for (const block of xml
    .slice(0, 1_000_000)
    .match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) ?? []) {
    const field = (name: string) =>
      block.match(
        new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"),
      )?.[1] ?? "";
    const title = plain(field("title")).slice(0, 220),
      link = plain(field("link"));
    try {
      const url = new URL(link);
      if (url.protocol !== "https:") continue;
      const date = new Date(plain(field("pubDate")));
      if (title)
        items.push({
          title,
          url: url.toString(),
          publishedAt: Number.isNaN(date.getTime()) ? null : date.toISOString(),
          source,
        });
    } catch {}
    if (items.length === 6) break;
  }
  return items;
}
export function normalizeCandles(input: unknown): Candle[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<number>();
  return input
    .flatMap((row) => {
      if (
        !Array.isArray(row) ||
        row.length < 6 ||
        !row
          .slice(0, 6)
          .every((n) => typeof n === "number" && Number.isFinite(n))
      )
        return [];
      const [time, low, high, open, close, volume] = row as number[];
      if (
        time <= 0 ||
        low <= 0 ||
        high < low ||
        open < low ||
        open > high ||
        close < low ||
        close > high ||
        volume < 0 ||
        seen.has(time)
      )
        return [];
      seen.add(time);
      return [{ time, low, high, open, close, volume }];
    })
    .sort((a, b) => a.time - b.time)
    .slice(-72);
}
export function summarizeLedger(
  sales: Array<{ created_at: string; amount: unknown; currency?: string }>,
  expenses: Array<{
    created_at: string;
    amount: unknown;
    payload?: { currency?: string } | null;
  }>,
  days: number,
  now: Date = new Date(),
) {
  const points: FinancePoint[] = Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - (days - 1 - i));
    return { date: d.toISOString().slice(0, 10), revenue: 0, expenses: 0 };
  });
  let excludedCurrencies = 0;
  const byDate = new Map(points.map((p) => [p.date, p]));
  for (const [rows, key] of [
    [sales, "revenue"],
    [expenses, "expenses"],
  ] as const) {
    for (const row of rows) {
      const currency =
        "currency" in row
          ? row.currency
          : "payload" in row
            ? row.payload?.currency
            : undefined;
      if (currency?.toLowerCase() !== "usd") {
        excludedCurrencies++;
        continue;
      }
      const n = Number(row.amount);
      if (!Number.isFinite(n)) continue;
      const p = byDate.get(row.created_at.slice(0, 10));
      if (p) p[key] += n;
    }
  }
  const revenue = points.reduce((s, p) => s + p.revenue, 0),
    expenseTotal = points.reduce((s, p) => s + p.expenses, 0);
  return {
    points,
    revenue,
    expenses: expenseTotal,
    net: revenue - expenseTotal,
    excludedCurrencies,
  };
}

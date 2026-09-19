import { NextResponse } from "next/server";
import { isLeadOwner } from "@/lib/leadOwner";
import { parseFeed } from "@/headquarters/normalize";
import {
  newsTopics,
  interleaveSources,
  type NewsTopic,
  type BriefItem,
} from "@/headquarters/news-topics";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(req: Request) {
  if (!(await isLeadOwner()))
    return NextResponse.json(
      { error: "Owner sign-in required" },
      { status: 401, headers },
    );
  const q = new URL(req.url).searchParams;
  const topic = q.get("topic") ?? "us";
  const mode = q.get("mode") ?? "reporting";
  if (
    !Object.prototype.hasOwnProperty.call(newsTopics, topic) ||
    !["x", "reporting"].includes(mode)
  )
    return NextResponse.json(
      { error: "Invalid news selection" },
      { status: 400, headers },
    );
  const config = newsTopics[topic as NewsTopic];
  if (mode === "x") {
    const token =
      process.env.X_BEARER_TOKEN ??
      process.env.TWITTER_BEARER_TOKEN ??
      process.env.X_API_BEARER_TOKEN;
    if (!token)
      return NextResponse.json(
        {
          items: [],
          connected: false,
          notice:
            "X reading connection not found in this deployment. Your posting connection may use different credentials.",
          checkedAt: new Date().toISOString(),
        },
        { headers },
      );
    const params = new URLSearchParams({
      query: `(${config.query}) -is:retweet`,
      max_results: "30",
      "tweet.fields": "created_at,author_id",
      expansions: "author_id",
      "user.fields": "name,username",
      sort_order: "recency",
    });
    try {
      const r = await fetch(
        `https://api.x.com/2/tweets/search/recent?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          next: { revalidate: 300 },
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!r.ok)
        throw new Error(
          r.status === 429
            ? "X rate limit reached; try again later."
            : r.status === 402
              ? "X requires available API credits."
              : "X could not authorize this news request. Check read/search access.",
        );
      const d = await r.json();
      type User = { id: string; username: string; name: string };
      const users = new Map<string, User>(
        (d.includes?.users ?? []).map((u: User) => [u.id, u]),
      );
      const groups = new Map<string, BriefItem[]>();
      for (const p of d.data ?? []) {
        const u = users.get(p.author_id);
        if (!u || !/^\d+$/.test(p.id)) continue;
        const name = u.username;
        const official = ["whitehouse", "potus", "presssec"].includes(
          name.toLowerCase(),
        );
        const item = {
          title: String(p.text),
          url: `https://x.com/${encodeURIComponent(name)}/status/${p.id}`,
          source: `${u.name} · @${name}`,
          publishedAt: p.created_at ?? null,
          kind: official
            ? "Official statement"
            : topic === "history"
              ? "History / commentary"
              : "Publisher post · reporting or commentary",
        };
        groups.set(name, [...(groups.get(name) ?? []), item]);
      }
      return NextResponse.json(
        {
          items: interleaveSources([...groups.values()]),
          connected: true,
          notice:
            "Posts are source statements, not independently verified facts. Multiple sources do not guarantee complete or unbiased coverage.",
          checkedAt: new Date().toISOString(),
        },
        { headers },
      );
    } catch (e) {
      return NextResponse.json(
        {
          items: [],
          connected: false,
          notice: e instanceof Error ? e.message : "X temporarily unavailable",
          checkedAt: new Date().toISOString(),
        },
        { headers },
      );
    }
  }
  const results = await Promise.allSettled(
    config.feeds.map(async ([source, url]) => {
      const r = await fetch(url, {
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) throw new Error("Feed unavailable");
      const xml = await r.text();
      return parseFeed(xml, source)
        .filter(
          (item) =>
            !("filter" in config) ||
            new RegExp(config.filter, "i").test(item.title),
        )
        .map((item) => ({
          ...item,
          kind:
            topic === "history"
              ? "Historical context"
              : "Reporting / analysis · check original source",
        }));
    }),
  );
  const unavailable = config.feeds
    .filter((_, i) => results[i].status === "rejected")
    .map((f) => f[0]);
  return NextResponse.json(
    {
      items: interleaveSources(
        results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : [])),
      ),
      connected: true,
      notice: `Sources alternate to avoid one publisher dominating. ${unavailable.length ? `Unavailable: ${unavailable.join(", ")}.` : ""}`,
      checkedAt: new Date().toISOString(),
    },
    { headers },
  );
}

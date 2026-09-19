import { NextResponse } from "next/server";
import { isLeadOwner } from "@/lib/leadOwner";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
async function read(url: string, seconds = 900) {
  const r = await fetch(url, {
    next: { revalidate: seconds },
    signal: AbortSignal.timeout(9000),
    headers: {
      "User-Agent": "AwadCommand/1.0 (https://awad-command.vercel.app)",
    },
  });
  if (!r.ok) throw new Error("Source temporarily unavailable");
  return r.json();
}
export async function GET(req: Request) {
  if (!(await isLeadOwner()))
    return NextResponse.json(
      { error: "Owner sign-in required" },
      { status: 401, headers },
    );
  const q = new URL(req.url).searchParams;
  try {
    if (q.has("city")) {
      const city = q.get("city")!.trim().slice(0, 100);
      if (city.length < 2)
        return NextResponse.json({ results: [] }, { headers });
      const d = await read(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=5&language=en&format=json`,
      );
      return NextResponse.json(
        {
          results: (d.results ?? []).map(
            (p: {
              name: string;
              admin1?: string;
              country: string;
              latitude: number;
              longitude: number;
              timezone: string;
            }) => ({
              name: [p.name, p.admin1, p.country].filter(Boolean).join(", "),
              lat: p.latitude,
              lon: p.longitude,
              timezone: p.timezone,
            }),
          ),
        },
        { headers },
      );
    }
    if (q.has("lat")) {
      const lat = Number(q.get("lat")),
        lon = Number(q.get("lon"));
      if (
        !q.has("lon") ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lon) ||
        Math.abs(lat) > 90 ||
        Math.abs(lon) > 180
      )
        return NextResponse.json(
          { error: "Invalid location" },
          { status: 400, headers },
        );
      const d = await read(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`,
      );
      return NextResponse.json(
        {
          current: d.current,
          timezone: d.timezone,
          checkedAt: new Date().toISOString(),
        },
        { headers },
      );
    }
    const date = q.get("date") ?? "";
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date
    )
      return NextResponse.json(
        { error: "Invalid date" },
        { status: 400, headers },
      );
    const d = await read(
      `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${date.slice(5, 7)}/${date.slice(8, 10)}`,
      86400,
    );
    type Event = {
      year: number;
      text: string;
      pages?: { content_urls?: { desktop?: { page?: string } } }[];
    };
    const events = (d.events ?? []) as Event[];
    events.sort(
      (a, b) =>
        Number(/war|battle|treaty|independen|peace|empire/i.test(b.text)) -
          Number(/war|battle|treaty|independen|peace|empire/i.test(a.text)) ||
        b.year - a.year,
    );
    return NextResponse.json(
      {
        events: events
          .slice(0, 8)
          .map((e) => ({
            year: e.year,
            text: e.text,
            url:
              e.pages?.[0]?.content_urls?.desktop?.page ??
              "https://en.wikipedia.org",
          })),
      },
      { headers },
    );
  } catch {
    return NextResponse.json(
      { error: "Source temporarily unavailable. Please try again." },
      { status: 502, headers },
    );
  }
}

import { NextResponse } from 'next/server';
import { probeFleetSites, type FleetSnapshot } from '@/lib/fleetProbe';

export const dynamic = 'force-dynamic';

const TTL_MS = 20_000;
let cache: { at: number; body: FleetSnapshot } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json(cache.body, { headers: { 'Cache-Control': 'no-store' } });
  }
  const sites = await probeFleetSites();
  const body: FleetSnapshot = { source: 'live', checkedAt: Date.now(), sites };
  cache = { at: Date.now(), body };
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}

import { NextResponse } from 'next/server';
import { buildMissionControlSnapshot } from '@/lib/missionControl';
import { readComputerStatus } from '@/lib/computerControl';
import { isAnthropicCeoEnabled, FLEET_BOT_MODEL } from '@/lib/env';
import { probeFleetSites, type FleetSnapshot } from '@/lib/fleetProbe';

export const dynamic = 'force-dynamic';

async function liveFleet(): Promise<FleetSnapshot> {
  return { source: 'live', checkedAt: Date.now(), sites: await probeFleetSites() };
}

export async function GET() {
  const [fleet, computer] = await Promise.all([liveFleet(), readComputerStatus()]);
  const body = await buildMissionControlSnapshot({
    fleet,
    computer,
    cixy: {
      provider: isAnthropicCeoEnabled() ? 'anthropic' : 'demo',
      enabled: isAnthropicCeoEnabled(),
      model: FLEET_BOT_MODEL,
    },
  });
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}

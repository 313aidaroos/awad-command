import { NextResponse } from 'next/server';
import { buildMissionControlSnapshot } from '@/lib/missionControl';
import { readComputerStatus } from '@/lib/computerControl';
import { isAnthropicCeoEnabled, FLEET_BOT_MODEL } from '@/lib/env';
import { probeFleetSites, type FleetSnapshot } from '@/lib/fleetProbe';
import { fetchWalletSummary } from '@/lib/walletStats';

export const dynamic = 'force-dynamic';

async function liveFleet(): Promise<FleetSnapshot> {
  return { source: 'live', checkedAt: Date.now(), sites: await probeFleetSites() };
}

export async function GET() {
  const [fleet, computer, wallet] = await Promise.all([
    liveFleet(),
    readComputerStatus(),
    fetchWalletSummary(30),
  ]);
  const body = await buildMissionControlSnapshot({
    fleet,
    computer,
    wallet,
    cixy: {
      provider: isAnthropicCeoEnabled() ? 'anthropic' : 'demo',
      enabled: isAnthropicCeoEnabled(),
      model: FLEET_BOT_MODEL,
    },
  });
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}

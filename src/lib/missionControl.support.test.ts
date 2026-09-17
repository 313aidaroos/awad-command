import { describe, expect, it } from 'vitest';
import { companyOps } from '@/config/companyOps';
import { buildMissionControlSnapshot } from '@/lib/missionControl';
import type { FleetSnapshot } from '@/lib/fleetProbe';
import type { ComputerStatus } from '@/lib/computerControl';

const fleet: FleetSnapshot = { source: 'live', checkedAt: 1, sites: [] };
const computer: ComputerStatus = { workerConnected: true, halted: false, capabilities: [], demo: false, latestScreenshot: null, stubUrl: null, needs: '' };

describe('Mission Control per-company support', () => {
  it('shows openTickets unavailable when no service key for company', async () => {
    const snapshot = await buildMissionControlSnapshot({ fleet, computer, cixy: { provider: 'anthropic', enabled: true, model: 'claude' } });
    const contraxis = snapshot.support.find(s => s.slug === 'contraxis');
    expect(contraxis?.openTickets.available).toBe(false);
  });

  it('shows bot model and cron pause state as facts', async () => {
    const snapshot = await buildMissionControlSnapshot({ fleet, computer, cixy: { provider: 'anthropic', enabled: true, model: 'claude' } });
    expect(snapshot.cixy.model).toMatch(/grok|xai|nous/i);
    expect(snapshot.ops.computer).toHaveProperty('cronPaused');
  });
});

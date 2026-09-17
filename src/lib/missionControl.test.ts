import { describe, expect, it } from 'vitest';
import { companyOps, ownerAdminEmail } from '@/config/companyOps';
import { buildMissionControlSnapshot, summarizeCixyReadiness } from '@/lib/missionControl';
import type { ComputerStatus } from '@/lib/computerControl';
import type { FleetSnapshot } from '@/lib/fleetProbe';

const fleet: FleetSnapshot = {
  source: 'live',
  checkedAt: 123,
  sites: [
    { slug: 'fast', name: 'Fast', url: 'https://fast.test', ok: true, httpStatus: 200, ms: 50 },
    { slug: 'slow', name: 'Slow', url: 'https://slow.test', ok: true, httpStatus: 200, ms: 900 },
    { slug: 'down', name: 'Down', url: 'https://down.test', ok: false, httpStatus: 500, ms: 100 },
  ],
};

const computer: ComputerStatus = {
  workerConnected: true,
  halted: false,
  capabilities: ['computer'],
  latestScreenshot: null,
  stubUrl: null,
  demo: false,
  needs: '',
};

describe('companyOps', () => {
  it('uses the approved owner/admin account and real support alias inventory', () => {
    expect(ownerAdminEmail).toBe('awad@apixis.dev');
    expect(companyOps.length).toBeGreaterThanOrEqual(13);
    expect(companyOps.find((item) => item.slug === 'socixis')?.supportAlias).toBe('support@socixis.dev');
    expect(companyOps.find((item) => item.slug === 'contentbot')?.supportAlias).toBe('unavailable');
  });
});

describe('buildMissionControlSnapshot', () => {
  it('keeps unavailable ops data explicit instead of inventing demo counts', async () => {
    const snapshot = await buildMissionControlSnapshot({
      fleet,
      computer,
      cixy: { provider: 'anthropic', enabled: true, model: 'claude-sonnet-5' },
      now: () => 456,
      liveOps: {
        source: 'live',
        checkedAt: 456,
        projects: [{ slug: 'contraxis', status: 'operational' }],
        openTasks: { available: true, count: 2 },
        openTickets: { available: false, reason: 'No ticket source connected' },
        revenueToday: { available: true, amount: 0 },
        leadsToday: { available: true, count: 0 },
        costs: { available: false, reason: 'No cost source connected' },
        admin: { available: true, email: ownerAdminEmail, status: 'configured' },
      },
    });
    expect(snapshot.source).toBe('live');
    expect(snapshot.fleet.down).toEqual(['Down']);
    expect(snapshot.fleet.slowest?.slug).toBe('slow');
    expect(snapshot.support.find((item) => item.slug === 'socixis')?.openTickets.available).toBe(false);
    expect(snapshot.financial.revenueToday).toMatchObject({ available: true, amount: 0 });
  });
});

describe('summarizeCixyReadiness', () => {
  it('requires Anthropic, live fleet, live ops, and computer readiness', () => {
    expect(summarizeCixyReadiness({ anthropic: true, fleet: true, ops: true, computer: true })).toMatchObject({ status: 'ready' });
    expect(summarizeCixyReadiness({ anthropic: true, fleet: true, ops: false, computer: true })).toMatchObject({ status: 'partial' });
  });
});

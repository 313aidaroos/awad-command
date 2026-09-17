import { describe, expect, it } from 'vitest';
import { buildContext } from '@/ceo/buildContext';
import type { CommandState } from '@/store/types';

const base = {
  dataMode: 'live' as const,
  projects: {},
  agents: {},
  events: { buffer: [], unread: 0 },
  approvals: [],
};

describe('buildContext live fleet facts', () => {
  it('tells Cixy which fleet sites are down and slowest', () => {
    const text = buildContext({
      ...base,
      fleet: {
        source: 'live',
        checkedAt: 1,
        sites: [
          { slug: 'ok', name: 'OK', url: 'https://ok.test', ok: true, httpStatus: 200, ms: 120 },
          { slug: 'slow', name: 'Slow', url: 'https://slow.test', ok: true, httpStatus: 200, ms: 880 },
          { slug: 'down', name: 'Down', url: 'https://down.test', ok: false, httpStatus: 500, ms: 44 },
        ],
      },
    } as Pick<CommandState, 'dataMode' | 'projects' | 'agents' | 'events' | 'approvals' | 'fleet'>);
    expect(text).toContain('Fleet: 2/3 up');
    expect(text).toContain('down=Down');
    expect(text).toContain('slowest=Slow 880ms');
  });
});

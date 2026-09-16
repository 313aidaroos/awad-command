import { describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/fleet/route';
import { FLEET_SITES } from '@/config/fleet';

describe('GET /api/fleet', () => {
  it('returns a live snapshot with one row per public site', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('ok', { status: 200 })),
    );
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      source: string;
      checkedAt: number;
      sites: Array<{ slug: string; ok: boolean; httpStatus: number | null }>;
    };
    expect(body.source).toBe('live');
    expect(body.checkedAt).toBeGreaterThan(0);
    expect(body.sites).toHaveLength(FLEET_SITES.length);
    expect(body.sites.every((site) => site.ok && site.httpStatus === 200)).toBe(true);
    vi.unstubAllGlobals();
  });
});

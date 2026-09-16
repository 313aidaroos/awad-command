import { describe, expect, it, vi } from 'vitest';
import { FLEET_SITES } from '@/config/fleet';
import { probeFleetSites, probeOne, siteIsUp } from '@/lib/fleetProbe';

describe('siteIsUp', () => {
  it('treats 2xx and 3xx as up', () => {
    expect(siteIsUp(200)).toBe(true);
    expect(siteIsUp(301)).toBe(true);
  });

  it('treats auth walls as up (site is live)', () => {
    expect(siteIsUp(401)).toBe(true);
    expect(siteIsUp(403)).toBe(true);
  });

  it('treats missing pages, errors, and no status as down', () => {
    expect(siteIsUp(404)).toBe(false);
    expect(siteIsUp(500)).toBe(false);
    expect(siteIsUp(null)).toBe(false);
  });
});

describe('probeOne', () => {
  it('records http status and latency from a live 200', async () => {
    const fetchImpl = vi.fn(async () => new Response('ok', { status: 200 })) as unknown as typeof fetch;
    const site = FLEET_SITES[0];
    let t = 10;
    const result = await probeOne(site, fetchImpl, () => {
      t += 5;
      return t;
    });
    expect(result.ok).toBe(true);
    expect(result.httpStatus).toBe(200);
    expect(result.slug).toBe(site.slug);
    expect(result.url).toBe(site.url);
    expect(result.ms).toBeGreaterThanOrEqual(0);
  });

  it('marks unreachable fetch as down without inventing a status', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('getaddrinfo ENOTFOUND');
    }) as unknown as typeof fetch;
    const result = await probeOne(FLEET_SITES[1], fetchImpl);
    expect(result.ok).toBe(false);
    expect(result.httpStatus).toBeNull();
    expect(result.error).toBe('unreachable');
  });
});

describe('probeFleetSites', () => {
  it('probes every configured public URL', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 200 })) as unknown as typeof fetch;
    const rows = await probeFleetSites(FLEET_SITES, fetchImpl);
    expect(rows).toHaveLength(FLEET_SITES.length);
    expect(fetchImpl).toHaveBeenCalledTimes(FLEET_SITES.length);
    expect(rows.every((row) => row.ok)).toBe(true);
  });
});

import { FLEET_SITES, type FleetSiteDef } from '@/config/fleet';

export type FleetSiteStatus = {
  slug: string;
  name: string;
  url: string;
  ok: boolean;
  httpStatus: number | null;
  ms: number;
  error?: string;
};

export type FleetSnapshot = {
  source: 'live' | 'idle';
  checkedAt: number;
  sites: FleetSiteStatus[];
};

const PROBE_MS = 4500;

/** 2xx–3xx and auth walls count as up. 404/5xx/network count as down. */
export function siteIsUp(httpStatus: number | null): boolean {
  if (httpStatus === null) return false;
  if (httpStatus >= 200 && httpStatus < 400) return true;
  return httpStatus === 401 || httpStatus === 403;
}

export async function probeOne(
  site: FleetSiteDef,
  fetchImpl: typeof fetch = fetch,
  now: () => number = Date.now,
): Promise<FleetSiteStatus> {
  const started = now();
  try {
    const response = await fetchImpl(site.url, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(PROBE_MS),
      headers: { Accept: 'text/html', 'User-Agent': 'AwadCommand-Fleet/1' },
    });
    const httpStatus = response.status;
    return {
      slug: site.slug,
      name: site.name,
      url: site.url,
      ok: siteIsUp(httpStatus),
      httpStatus,
      ms: Math.max(0, now() - started),
    };
  } catch (error) {
    const message = error instanceof Error ? error.name : 'probe_failed';
    return {
      slug: site.slug,
      name: site.name,
      url: site.url,
      ok: false,
      httpStatus: null,
      ms: Math.max(0, now() - started),
      error: message === 'TimeoutError' || message === 'AbortError' ? 'timeout' : 'unreachable',
    };
  }
}

export async function probeFleetSites(
  sites: readonly FleetSiteDef[] = FLEET_SITES,
  fetchImpl: typeof fetch = fetch,
): Promise<FleetSiteStatus[]> {
  return Promise.all(sites.map((site) => probeOne(site, fetchImpl)));
}

export function emptyFleet(): FleetSnapshot {
  return { source: 'idle', checkedAt: 0, sites: [] };
}

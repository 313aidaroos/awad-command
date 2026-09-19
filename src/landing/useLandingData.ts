'use client';

import { useEffect, useState } from 'react';
import type { FleetSnapshot } from '@/lib/fleetProbe';
import type { MissionControlSnapshot } from '@/lib/missionControl';

export interface LandingData {
  fleet: FleetSnapshot | null;
  mission: MissionControlSnapshot | null;
  loading: boolean;
  error: string | null;
}

export function useLandingData(pollMs = 60_000): LandingData {
  const [fleet, setFleet] = useState<FleetSnapshot | null>(null);
  const [mission, setMission] = useState<MissionControlSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    async function pull() {
      try {
        const [f, m] = await Promise.all([
          fetch('/api/fleet', { cache: 'no-store' }),
          fetch('/api/mission-control', { cache: 'no-store' }),
        ]);
        if (!live) return;
        if (f.ok) setFleet((await f.json()) as FleetSnapshot);
        if (m.ok) setMission((await m.json()) as MissionControlSnapshot);
        if (!f.ok && !m.ok) setError('Live sources unreachable');
        else setError(null);
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : 'fetch failed');
      } finally {
        if (live) setLoading(false);
      }
    }
    void pull();
    const t = window.setInterval(() => void pull(), pollMs);
    return () => {
      live = false;
      window.clearInterval(t);
    };
  }, [pollMs]);

  return { fleet, mission, loading, error };
}

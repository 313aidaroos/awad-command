import { DemoEventSource } from '@/data/DemoEventSource';
import { startTaskReportSubscription } from '@/data/TaskReportSource';
import type { FleetSnapshot } from '@/lib/fleetProbe';
import { useCommandStore } from '@/store/useCommandStore';

let source: DemoEventSource | null = null;
let tickId: number | null = null;
let stopReports: (() => void) | null = null;
let fleetTimer: number | null = null;

async function pullFleet() {
  try {
    const res = await fetch('/api/fleet', { cache: 'no-store' });
    if (!res.ok) return;
    const body = (await res.json()) as FleetSnapshot;
    if (!body || body.source !== 'live' || !Array.isArray(body.sites)) return;
    useCommandStore.getState().applyFleet(body);
  } catch {
    // Keep the last snapshot. The panel stays honest: idle until a live payload lands.
  }
}

export function startDataLayer() {
  if (source) return;
  useCommandStore.getState().initFromRegistry();
  source = new DemoEventSource();
  source.start((event) => useCommandStore.getState().applyEvent(event));
  stopReports = startTaskReportSubscription();
  void pullFleet();
  fleetTimer = window.setInterval(() => {
    void pullFleet();
  }, 60_000);
  let last = performance.now();
  let acc = 0;
  const loop = (now: number) => {
    acc += (now - last) / 1000;
    last = now;
    if (acc >= 0.1) {
      useCommandStore.getState().tick(acc);
      acc = 0;
    }
    tickId = window.requestAnimationFrame(loop);
  };
  tickId = window.requestAnimationFrame(loop);
}

export function stopDataLayer() {
  source?.stop();
  source = null;
  stopReports?.();
  stopReports = null;
  if (fleetTimer !== null) window.clearInterval(fleetTimer);
  fleetTimer = null;
  if (tickId !== null) window.cancelAnimationFrame(tickId);
  tickId = null;
}

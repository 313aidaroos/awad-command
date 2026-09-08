import { DemoEventSource } from '@/data/DemoEventSource';
import { useCommandStore } from '@/store/useCommandStore';

let source: DemoEventSource | null = null;
let tickId: number | null = null;

export function startDataLayer() {
  if (source) return;
  useCommandStore.getState().initFromRegistry();
  source = new DemoEventSource();
  source.start((event) => useCommandStore.getState().applyEvent(event));
  let last = performance.now();
  const loop = (now: number) => {
    useCommandStore.getState().tick((now - last) / 1000);
    last = now;
    tickId = window.requestAnimationFrame(loop);
  };
  tickId = window.requestAnimationFrame(loop);
}

export function stopDataLayer() {
  source?.stop();
  source = null;
  if (tickId !== null) window.cancelAnimationFrame(tickId);
  tickId = null;
}

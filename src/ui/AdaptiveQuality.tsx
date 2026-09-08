'use client';

import { useEffect } from 'react';
import { isSafariLike } from '@/lib/safari';
import { useCommandStore } from '@/store/useCommandStore';

/** Steps quality down when frame time stays poor. Never auto-promotes to HIGH. */
export function AdaptiveQuality() {
  const auto = useCommandStore((s) => s.quality.auto);

  useEffect(() => {
    if (!auto || isSafariLike()) return;
    let frames = 0;
    let last = performance.now();
    let low = 0;
    let id = 0;
    const loop = (now: number) => {
      frames += 1;
      if (now - last >= 1000) {
        const fps = (frames * 1000) / (now - last);
        frames = 0;
        last = now;
        const { quality, setQuality } = useCommandStore.getState();
        if (!quality.auto) return;
        if (fps < 28 && quality.level === 'high') {
          low += 1;
          if (low >= 2) {
            setQuality('medium', true);
            low = 0;
          }
        } else {
          low = 0;
        }
      }
      id = window.requestAnimationFrame(loop);
    };
    id = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(id);
  }, [auto]);

  return null;
}

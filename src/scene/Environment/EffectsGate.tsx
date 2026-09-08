'use client';

import { useEffect, useState, type ComponentType } from 'react';
import { isSafariLike } from '@/lib/safari';
import { useCommandStore } from '@/store/useCommandStore';

/** Loads EffectComposer only after a client check that this is not Safari/WebKit. */
export function EffectsGate() {
  const level = useCommandStore((s) => s.quality.level);
  const [Fx, setFx] = useState<ComponentType | null>(null);

  useEffect(() => {
    if (isSafariLike() || level === 'low') {
      setFx(null);
      return;
    }
    let live = true;
    import('@/scene/Environment/Effects')
      .then((mod) => {
        if (live) setFx(() => mod.Effects);
      })
      .catch(() => {
        if (live) setFx(null);
      });
    return () => {
      live = false;
    };
  }, [level]);

  if (isSafariLike() || !Fx) return null;
  return <Fx />;
}

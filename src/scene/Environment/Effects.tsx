'use client';

import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { isSafariLike } from '@/lib/safari';
import { useCommandStore } from '@/store/useCommandStore';

/** Never mounted on Safari/WebKit — CommandCanvas never loads EffectsGate there. */
export function Effects() {
  const level = useCommandStore((s) => s.quality.level);
  if (isSafariLike() || level === 'low') return null;

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom intensity={level === 'high' ? 0.55 : 0.32} luminanceThreshold={level === 'high' ? 0.42 : 0.5} />
      <Vignette eskil={false} offset={0.18} darkness={0.62} />
    </EffectComposer>
  );
}

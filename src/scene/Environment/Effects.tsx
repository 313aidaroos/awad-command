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
      <Bloom intensity={level === 'high' ? 0.82 : 0.55} luminanceThreshold={0.28} />
      <Vignette eskil={false} offset={0.15} darkness={0.55} />
    </EffectComposer>
  );
}

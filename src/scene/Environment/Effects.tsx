'use client';

import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { isSafariLike } from '@/lib/safari';
import { useCommandStore } from '@/store/useCommandStore';

/** Never mounted on Safari/WebKit — EffectsGate and supportsPostprocessing keep EffectComposer off. */
export function Effects() {
  const level = useCommandStore((s) => s.quality.level);
  if (isSafariLike() || level === 'low') return null;

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom intensity={level === 'high' ? 0.7 : 0.45} luminanceThreshold={0.35} />
      <Vignette eskil={false} offset={0.15} darkness={0.55} />
    </EffectComposer>
  );
}

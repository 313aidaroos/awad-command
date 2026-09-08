'use client';

import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { isSafariLike } from '@/lib/safari';
import { useCommandStore } from '@/store/useCommandStore';

/** Never mounted on Safari/WebKit — CommandCanvas never loads EffectsGate there. */
export function Effects() {
  const level = useCommandStore((s) => s.quality.level);
  const view = useCommandStore((s) => s.view);
  if (isSafariLike() || level === 'low' || view !== 'universe') return null;

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom intensity={level === 'high' ? 0.36 : 0.18} luminanceThreshold={level === 'high' ? 0.58 : 0.66} />
      <Vignette eskil={false} offset={0.22} darkness={0.22} />
    </EffectComposer>
  );
}

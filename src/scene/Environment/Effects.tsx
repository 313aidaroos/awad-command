'use client';

import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { useCommandStore } from '@/store/useCommandStore';

export function Effects() {
  const level = useCommandStore((s) => s.quality.level);
  if (level === 'low') return null;
  return (
    <EffectComposer>
      <Bloom intensity={level === 'high' ? 0.7 : 0.45} luminanceThreshold={0.35} mipmapBlur />
      <Vignette eskil={false} offset={0.15} darkness={0.55} />
    </EffectComposer>
  );
}

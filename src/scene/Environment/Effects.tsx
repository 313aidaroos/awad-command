'use client';

import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { EffectComposer as EffectComposerImpl } from 'postprocessing';
import { UnsignedByteType } from 'three';
import { supportsPostprocessing } from '@/lib/webgl';
import { useCommandStore } from '@/store/useCommandStore';

export function Effects() {
  const level = useCommandStore((s) => s.quality.level);
  const gl = useThree((s) => s.gl);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let probe: EffectComposerImpl | null = null;
    try {
      if (!supportsPostprocessing(gl)) {
        setEnabled(false);
        return;
      }
      probe = new EffectComposerImpl(gl, {
        multisampling: 0,
        frameBufferType: UnsignedByteType,
      });
      setEnabled(true);
    } catch {
      setEnabled(false);
    } finally {
      probe?.dispose();
    }
  }, [gl]);

  if (level === 'low' || !enabled) return null;

  return (
    <EffectComposer
      multisampling={0}
      frameBufferType={UnsignedByteType}
      enableNormalPass={false}
    >
      <Bloom intensity={level === 'high' ? 0.7 : 0.45} luminanceThreshold={0.35} />
      <Vignette eskil={false} offset={0.15} darkness={0.55} />
    </EffectComposer>
  );
}

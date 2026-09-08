'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { particleCount } from '@/lib/quality';
import { useCommandStore } from '@/store/useCommandStore';

export function EntityField({ accent, radius = 0.95 }: { accent: string; radius?: number }) {
  const quality = useCommandStore((s) => s.quality.level);
  const geo = useMemo(() => {
    const n = particleCount(quality, 110, 64, 36);
    const positions = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 1) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const rr = Math.cbrt(Math.random()) * radius;
      positions.set(
        [rr * Math.sin(ph) * Math.cos(th), rr * Math.sin(ph) * Math.sin(th), rr * Math.cos(ph)],
        i * 3,
      );
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [quality, radius]);

  return (
    <points geometry={geo}>
      <pointsMaterial
        color={accent}
        size={0.038}
        transparent
        opacity={0.72}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

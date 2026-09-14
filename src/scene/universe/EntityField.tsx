'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { particleCount } from '@/lib/quality';
import { useCommandStore } from '@/store/useCommandStore';

export function EntityField({
  accent,
  radius = 1.15,
  activity = 0.3,
}: {
  accent: string;
  radius?: number;
  activity?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const quality = useCommandStore((s) => s.quality.level);
  const geo = useMemo(() => {
    const n = particleCount(quality, 90, 48, 22);
    const positions = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 1) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const rr = 0.55 + Math.cbrt(Math.random()) * radius;
      positions.set(
        [rr * Math.sin(ph) * Math.cos(th), rr * Math.sin(ph) * Math.sin(th) * 0.55, rr * Math.cos(ph)],
        i * 3,
      );
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [quality, radius]);

  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * (0.04 + activity * 0.05);
  });

  return (
    <group ref={group}>
      <points geometry={geo}>
        <pointsMaterial
          color={accent}
          size={0.028}
          transparent
          opacity={0.22}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

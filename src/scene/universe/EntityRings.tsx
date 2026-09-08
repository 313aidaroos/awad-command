'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function EntityRings({
  count,
  accent,
  radius = 1.42,
}: {
  count: number;
  accent: string;
  radius?: number;
}) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!group.current) return;
    group.current.rotation.y += dt * 0.05;
    group.current.rotation.x += dt * 0.015;
  });
  const rings = Math.max(0, Math.min(3, count));
  if (rings === 0) return null;
  return (
    <group ref={group}>
      {Array.from({ length: rings }, (_, i) => (
        <mesh key={i} rotation={[1.15 + i * 0.28, i * 0.4, 0.15 * i]}>
          <torusGeometry args={[radius + i * 0.16, 0.008, 10, 80]} />
          <meshStandardMaterial
            color={i === 0 ? accent : '#E6E8EC'}
            metalness={0.82}
            roughness={0.14}
            transparent
            opacity={0.7 - i * 0.12}
          />
        </mesh>
      ))}
    </group>
  );
}

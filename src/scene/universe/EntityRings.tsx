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
  const rings = Math.max(1, Math.min(3, count));
  return (
    <group ref={group}>
      {Array.from({ length: rings }, (_, i) => (
        <mesh key={i} rotation={[1.15 + i * 0.28, i * 0.4, 0.15 * i]}>
          <torusGeometry args={[radius + i * 0.16, 0.01, 8, 64]} />
          <meshBasicMaterial color={i === 0 ? accent : '#9aa3b2'} transparent opacity={0.28 - i * 0.05} />
        </mesh>
      ))}
    </group>
  );
}

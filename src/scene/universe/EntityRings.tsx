'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SilverMaterial } from '@/scene/materials/SilverMaterial';

export function EntityRings({
  count,
  accent,
  radius = 1.48,
}: {
  count: number;
  accent: string;
  radius?: number;
}) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!group.current) return;
    group.current.rotation.y += dt * 0.04;
    group.current.rotation.x += dt * 0.012;
  });
  const rings = Math.max(0, Math.min(3, count));
  if (rings === 0) return null;
  return (
    <group ref={group}>
      {Array.from({ length: rings }, (_, i) => (
        <mesh key={i} rotation={[1.12 + i * 0.26, i * 0.35, 0.12 * i]}>
          <torusGeometry args={[radius + i * 0.18, i === 0 ? 0.012 : 0.007, 8, 80]} />
          {i === 0 ? (
            <meshBasicMaterial color={accent} transparent opacity={0.55} toneMapped={false} />
          ) : (
            <SilverMaterial roughness={0.2} />
          )}
        </mesh>
      ))}
    </group>
  );
}

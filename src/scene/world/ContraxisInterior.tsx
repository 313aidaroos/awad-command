'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ChassisMaterial } from '@/scene/materials/ChassisMaterial';
import { SilverMaterial } from '@/scene/materials/SilverMaterial';

/** Contraxis-only: planted pipeline spine so the interior reads as a facility, not a bubble. */
export function ContraxisInterior() {
  const scan = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!scan.current) return;
    scan.current.position.x = Math.sin(state.clock.elapsedTime * 0.12) * 6.5;
  });

  return (
    <group>
      <mesh position={[0.4, -3.05, 0.4]} rotation={[0, 0.18, 0]}>
        <boxGeometry args={[16.4, 0.08, 1.15]} />
        <ChassisMaterial roughness={0.38} />
      </mesh>
      <mesh position={[0.4, -3.0, 0.4]} rotation={[0, 0.18, 0]}>
        <boxGeometry args={[16.4, 0.02, 0.12]} />
        <meshBasicMaterial color="#3D8BFF" transparent opacity={0.45} toneMapped={false} />
      </mesh>
      {[-6.2, -2.1, 2.2, 6.4].map((x) => (
        <mesh key={x} position={[x, -0.4, -0.2]}>
          <boxGeometry args={[0.12, 5.2, 0.12]} />
          <SilverMaterial roughness={0.3} />
        </mesh>
      ))}
      <mesh ref={scan} position={[0, -2.92, 0.4]}>
        <boxGeometry args={[0.8, 0.015, 1.05]} />
        <meshBasicMaterial color="#3D8BFF" transparent opacity={0.28} toneMapped={false} />
      </mesh>
    </group>
  );
}

'use client';

import { Graphite } from '@/scene/kit/materials';

/** Soft studio cyc so the plaza is not a toy in a black void. */
export function StudioCyc() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.16, 0]}>
        <circleGeometry args={[42, 72]} />
        <meshStandardMaterial color="#12151A" metalness={0.22} roughness={0.86} />
      </mesh>
      <mesh position={[0, 10, -28]}>
        <cylinderGeometry args={[36, 36, 22, 48, 1, true, Math.PI * 0.15, Math.PI * 0.7]} />
        <Graphite roughness={0.72} metalness={0.28} />
      </mesh>
    </group>
  );
}

'use client';

import { Brushed } from '@/scene/kit/materials';

/** Quiet plaza disc — no colonnade, no contact-shadow tabletop, no tick field. */
export function CathedralDeck() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <circleGeometry args={[24, 80]} />
        <meshStandardMaterial color="#14181F" metalness={0.42} roughness={0.58} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <ringGeometry args={[10.2, 10.38, 80]} />
        <meshStandardMaterial color="#2E353E" metalness={0.7} roughness={0.28} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[6.2, 72]} />
        <meshStandardMaterial color="#1A1F26" metalness={0.62} roughness={0.34} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[6.05, 6.22, 72]} />
        <Brushed roughness={0.18} />
      </mesh>
    </group>
  );
}

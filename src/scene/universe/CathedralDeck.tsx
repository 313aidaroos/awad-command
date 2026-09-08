'use client';

import { Brushed, FloorMetal } from '@/scene/kit/materials';

/** Quiet plaza disc — PBR floor, no colonnade, no tick field. */
export function CathedralDeck() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <circleGeometry args={[22, 80]} />
        <FloorMetal roughness={0.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <ringGeometry args={[9.6, 9.78, 80]} />
        <meshStandardMaterial color="#3A424C" metalness={0.74} roughness={0.26} envMapIntensity={1.8} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[5.6, 72]} />
        <FloorMetal roughness={0.38} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[5.42, 5.6, 72]} />
        <Brushed roughness={0.16} />
      </mesh>
    </group>
  );
}

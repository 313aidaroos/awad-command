'use client';

import { ContactShadows } from '@react-three/drei';
import { Brushed } from '@/scene/kit/materials';
import { useCommandStore } from '@/store/useCommandStore';

/** Quiet plaza disc — no colonnade grid, no tick field. */
export function CathedralDeck() {
  const level = useCommandStore((s) => s.quality.level);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <circleGeometry args={[24, 80]} />
        <meshStandardMaterial color="#161A20" metalness={0.34} roughness={0.68} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <ringGeometry args={[10.4, 10.55, 80]} />
        <meshStandardMaterial color="#2A3038" metalness={0.62} roughness={0.36} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[6.4, 72]} />
        <meshStandardMaterial color="#1E242C" metalness={0.58} roughness={0.38} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <ringGeometry args={[6.22, 6.42, 72]} />
        <Brushed roughness={0.22} />
      </mesh>
      {level === 'low' ? null : (
        <ContactShadows position={[0, -0.09, 0]} opacity={0.44} scale={38} blur={2.6} far={12} color="#000000" />
      )}
    </group>
  );
}

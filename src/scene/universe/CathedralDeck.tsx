'use client';

import { ContactShadows } from '@react-three/drei';
import { Brushed } from '@/scene/kit/materials';
import { Column } from '@/scene/kit/parts';
import { useCommandStore } from '@/store/useCommandStore';

const COLS: Array<[number, number]> = [
  [13.6, 0],
  [-13.6, 0],
  [6.8, 11.8],
  [-6.8, 11.8],
  [6.8, -11.8],
  [-6.8, -11.8],
];

/** Quiet plaza — one floor, six columns, no cyan tick field. */
export function CathedralDeck() {
  const level = useCommandStore((s) => s.quality.level);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
        <circleGeometry args={[22, 72]} />
        <meshStandardMaterial color="#14181E" metalness={0.38} roughness={0.62} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[7.2, 64]} />
        <meshStandardMaterial color="#1C2128" metalness={0.55} roughness={0.42} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[7.05, 7.22, 64]} />
        <Brushed roughness={0.28} />
      </mesh>
      {COLS.map(([x, z]) => (
        <group key={`${x}:${z}`} position={[x, 0, z]}>
          <Column height={3.6} width={0.38} />
        </group>
      ))}
      {level === 'low' ? null : (
        <ContactShadows position={[0, -0.07, 0]} opacity={0.4} scale={36} blur={2.8} far={12} color="#000000" />
      )}
    </group>
  );
}

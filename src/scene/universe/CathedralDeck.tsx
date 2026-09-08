'use client';

import { ContactShadows } from '@react-three/drei';
import { Column, FloorPlate, Slit } from '@/scene/kit/parts';
import { TiledDeck } from '@/scene/kit/TiledDeck';
import { Brushed, Graphite } from '@/scene/kit/materials';
import { useCommandStore } from '@/store/useCommandStore';

const COLS: Array<[number, number]> = [
  [16.4, 0],
  [-16.4, 0],
  [0, 16.4],
  [0, -16.4],
  [11.6, 11.6],
  [-11.6, 11.6],
  [11.6, -11.6],
  [-11.6, -11.6],
  [16.4, 6.8],
  [16.4, -6.8],
  [-16.4, 6.8],
  [-16.4, -6.8],
  [6.8, 16.4],
  [-6.8, 16.4],
  [6.8, -16.4],
  [-6.8, -16.4],
];

/** Shared cathedral plaza — columns, inner ring, tiled floor. */
export function CathedralDeck() {
  const level = useCommandStore((s) => s.quality.level);
  const cols = level === 'low' ? COLS.filter((_, i) => i % 2 === 0) : COLS;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
        <circleGeometry args={[28, 64]} />
        <meshStandardMaterial color="#0A0C10" metalness={0.18} roughness={0.92} />
      </mesh>
      <TiledDeck radius={18.4} y={-0.02} />
      <group position={[0, 0.02, 0]}>
        <FloorPlate size={[6.4, 6.4]} />
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[5.9, 6.08, 64]} />
        <Brushed roughness={0.3} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <ringGeometry args={[17.7, 17.95, 72]} />
        <Brushed roughness={0.36} />
      </mesh>
      {cols.map(([x, z]) => (
        <group key={`${x}:${z}`} position={[x, 0, z]}>
          <Column height={4.4} width={0.32} />
        </group>
      ))}
      {level === 'low'
        ? null
        : cols.map(([x, z], i) =>
            i % 2 === 0 ? (
              <Slit
                key={`slit-${x}:${z}`}
                position={[x * 0.42, 0.04, z * 0.42]}
                size={[0.9, 0.02, 0.04]}
                accent="#3D8BFF"
                intensity={0.35}
              />
            ) : null,
          )}
      <mesh position={[0, 2.15, 16.4]}>
        <boxGeometry args={[8.4, 0.12, 0.22]} />
        <Graphite roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.15, -16.4]}>
        <boxGeometry args={[8.4, 0.12, 0.22]} />
        <Graphite roughness={0.4} />
      </mesh>
      {level === 'low' ? null : (
        <ContactShadows position={[0, -0.08, 0]} opacity={0.45} scale={42} blur={2.6} far={14} color="#000000" />
      )}
    </group>
  );
}

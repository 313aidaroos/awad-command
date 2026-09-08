'use client';

import { DoubleSide } from 'three';

export function CommandDeck() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -6.8, 0]}>
        <circleGeometry args={[30, 72]} />
        <meshStandardMaterial color="#2A3038" metalness={0.42} roughness={0.52} />
      </mesh>
      {[8, 15.5, 23, 29.5].map((r, i) => (
        <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, -6.68, 0]}>
          <torusGeometry args={[r, i === 1 ? 0.045 : 0.022, 8, 80]} />
          <meshBasicMaterial color="#E6E8EC" transparent opacity={i === 1 ? 0.32 : 0.14} />
        </mesh>
      ))}
      <mesh position={[0, -6.5, 0]}>
        <cylinderGeometry args={[2.6, 3.1, 0.42, 48]} />
        <meshStandardMaterial color="#3A414C" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -6.28, 0]}>
        <ringGeometry args={[2.55, 2.85, 48]} />
        <meshBasicMaterial color="#C5CBD4" transparent opacity={0.45} side={DoubleSide} />
      </mesh>
    </group>
  );
}

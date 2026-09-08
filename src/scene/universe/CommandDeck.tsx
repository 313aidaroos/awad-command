'use client';

import { DoubleSide } from 'three';

/** Spatial OS: a command plane the worlds sit above — not empty void with toys. */
export function CommandDeck() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -6.8, 0]}>
        <circleGeometry args={[28, 72]} />
        <meshStandardMaterial
          color="#0A0C10"
          metalness={0.78}
          roughness={0.4}
          transparent
          opacity={0.92}
        />
      </mesh>
      {[7.5, 14.5, 22, 28].map((r, i) => (
        <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, -6.72, 0]}>
          <torusGeometry args={[r, i === 1 ? 0.03 : 0.016, 8, 80]} />
          <meshBasicMaterial color="#E6E8EC" transparent opacity={i === 1 ? 0.16 : 0.07} />
        </mesh>
      ))}
      <mesh position={[0, -6.55, 0]}>
        <cylinderGeometry args={[2.4, 2.8, 0.28, 48]} />
        <meshStandardMaterial color="#12151C" metalness={0.88} roughness={0.28} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -6.4, 0]}>
        <ringGeometry args={[2.35, 2.55, 48]} />
        <meshBasicMaterial color="#C9D0DA" transparent opacity={0.28} side={DoubleSide} />
      </mesh>
    </group>
  );
}

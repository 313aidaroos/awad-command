'use client';

import { BackSide } from 'three';

/** Closed rectangular nave — floors, walls, ceiling. Not a cylinder diorama. */
export function WorldChamber() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[22.4, 7.4, 9.4]} />
        <meshStandardMaterial color="#2A3038" metalness={0.36} roughness={0.58} side={BackSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.18, 0]}>
        <planeGeometry args={[22.2, 9.2]} />
        <meshStandardMaterial color="#232830" metalness={0.32} roughness={0.62} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3.68, 0]}>
        <planeGeometry args={[22.2, 9.2]} />
        <meshStandardMaterial color="#1C2026" metalness={0.3} roughness={0.66} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.4, -3.16, 0]}>
        <planeGeometry args={[20.4, 1.42]} />
        <meshStandardMaterial color="#161A20" metalness={0.22} roughness={0.72} />
      </mesh>
      <pointLight color="#e4e8ee" intensity={0.55} distance={18} position={[-4.5, 2.4, 0]} />
      <pointLight color="#d5dbe4" intensity={0.42} distance={16} position={[5.5, 2.2, 0]} />
    </group>
  );
}

'use client';

import { BackSide } from 'three';

/** Closed rectangular nave — floors, walls, ceiling. Not a cylinder diorama. */
export function WorldChamber() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[22.4, 7.4, 9.4]} />
        <meshStandardMaterial color="#3A424C" metalness={0.34} roughness={0.56} side={BackSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.18, 0]}>
        <planeGeometry args={[22.2, 9.2]} />
        <meshStandardMaterial color="#242A32" metalness={0.3} roughness={0.64} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3.68, 0]}>
        <planeGeometry args={[22.2, 9.2]} />
        <meshStandardMaterial color="#2A3038" metalness={0.28} roughness={0.66} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.4, -3.16, 0]}>
        <planeGeometry args={[20.4, 1.42]} />
        <meshStandardMaterial color="#1A1E24" metalness={0.2} roughness={0.74} />
      </mesh>
      <pointLight color="#e8edf4" intensity={1.35} distance={22} position={[-4.2, 2.5, 0]} />
      <pointLight color="#dfe4ec" intensity={1.15} distance={20} position={[3.2, 2.2, 0]} />
      <pointLight color="#cfd6e0" intensity={0.9} distance={16} position={[8.4, 1.6, 0]} />
    </group>
  );
}

'use client';

import { BackSide } from 'three';
import { SilverMaterial } from '@/scene/materials/SilverMaterial';

/** Opaque hangar. Back-face walls occlude the universe — never a translucent dome. */
export function WorldChamber() {
  const wallSegs = 48;
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[13.8, 13.8, 8.4, wallSegs, 1, true]} />
        <meshStandardMaterial color="#0B0D11" metalness={0.72} roughness={0.42} side={BackSide} />
      </mesh>
      <mesh position={[0, 4.15, 0]} rotation={[Math.PI, 0, 0]}>
        <circleGeometry args={[13.8, wallSegs]} />
        <meshStandardMaterial color="#090B0E" metalness={0.68} roughness={0.48} side={BackSide} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 13.55, 0.4, Math.sin(a) * 13.55]}>
            <boxGeometry args={[0.08, 7.6, 0.08]} />
            <SilverMaterial roughness={0.28} />
          </mesh>
        );
      })}
      <mesh position={[0, 4.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[4.2, 0.04, 8, 48]} />
        <meshBasicMaterial color="#E6E8EC" transparent opacity={0.18} />
      </mesh>
      <mesh position={[0, 4.08, 0]}>
        <circleGeometry args={[1.1, 24]} />
        <meshBasicMaterial color="#dfe4ee" transparent opacity={0.22} />
      </mesh>
      <pointLight color="#e8edf5" intensity={0.7} distance={22} position={[0, 3.6, 0]} />
      <pointLight color="#c5d0e0" intensity={0.45} distance={18} position={[4, 2.2, 5]} />
    </group>
  );
}

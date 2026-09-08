'use client';

import { BackSide } from 'three';
import { SilverMaterial } from '@/scene/materials/SilverMaterial';

export function WorldChamber() {
  const wallSegs = 48;
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[13.8, 13.8, 8.4, wallSegs, 1, true]} />
        <meshStandardMaterial color="#2A3038" metalness={0.38} roughness={0.55} side={BackSide} />
      </mesh>
      <mesh position={[0, 4.15, 0]} rotation={[Math.PI, 0, 0]}>
        <circleGeometry args={[13.8, wallSegs]} />
        <meshStandardMaterial color="#232830" metalness={0.35} roughness={0.58} side={BackSide} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 13.55, 0.4, Math.sin(a) * 13.55]}>
            <boxGeometry args={[0.1, 7.6, 0.1]} />
            <SilverMaterial roughness={0.32} />
          </mesh>
        );
      })}
      <mesh position={[0, 4.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[4.2, 0.05, 8, 48]} />
        <meshBasicMaterial color="#E6E8EC" transparent opacity={0.28} />
      </mesh>
      <pointLight color="#e8edf5" intensity={0.85} distance={22} position={[0, 3.4, 0]} />
      <pointLight color="#c5d0e0" intensity={0.5} distance={16} position={[5, 2, 4]} />
    </group>
  );
}

'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { requestCeoOpen } from '@/lib/ceoBridge';
import { BrushedMetal } from '@/scene/materials/BrushedMetal';
import { FloatingLabel } from '@/scene/ui/FloatingLabel';
import { WorldName } from '@/scene/ui/WorldName';
import { useCommandStore } from '@/store/useCommandStore';

function IntelligenceShell() {
  const gyro = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (gyro.current) gyro.current.rotation.y += dt * 0.05;
  });

  return (
    <group>
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.35, 2.55, 0.36, 48]} />
        <BrushedMetal color="#8A909A" roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <torusGeometry args={[2.15, 0.07, 12, 56]} />
        <BrushedMetal color="#C5CAD3" roughness={0.22} />
      </mesh>
      <mesh position={[0, 2.7, 0]} castShadow>
        <icosahedronGeometry args={[1.15, 1]} />
        <BrushedMetal color="#3A3F47" roughness={0.38} />
      </mesh>
      <group ref={gyro} position={[0, 2.7, 0]}>
        <mesh rotation={[1.35, 0, 0]} castShadow>
          <torusGeometry args={[2.55, 0.16, 16, 80]} />
          <BrushedMetal color="#C5CAD3" roughness={0.2} />
        </mesh>
        <mesh rotation={[0.25, 1.05, 0.4]} castShadow>
          <torusGeometry args={[2.25, 0.13, 14, 72]} />
          <BrushedMetal color="#9AA0A8" roughness={0.24} />
        </mesh>
        <mesh rotation={[1.05, 0.6, 1.1]} castShadow>
          <torusGeometry args={[1.95, 0.09, 12, 64]} />
          <BrushedMetal color="#8A909A" roughness={0.26} />
        </mesh>
        <mesh rotation={[1.35, 0, 0]}>
          <torusGeometry args={[2.55, 0.018, 8, 64]} />
          <meshStandardMaterial color="#3D8BFF" emissive="#3D8BFF" emissiveIntensity={0.45} toneMapped={false} />
        </mesh>
      </group>
      <pointLight color="#E6E8EC" intensity={0.65} distance={14} position={[2.4, 5.2, 3.2]} />
      <pointLight color="#3D8BFF" intensity={0.16} distance={8} position={[0, 2.7, 0]} />
    </group>
  );
}

/** Wide metallic gyro — focal mass from across the plaza. Not a silo, gem, or kiosk pit. */
export function CeoCore() {
  const focused = useCommandStore((s) => s.focusedProject);
  const flyTo = useCommandStore((s) => s.flyTo);

  if (focused) return null;

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        flyTo({ position: [5.4, 3.6, 8.6], lookAt: [0, 2.5, 0], duration: 1.05, phase: 'universe' });
        requestCeoOpen();
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'grab';
      }}
    >
      <IntelligenceShell />
      <FloatingLabel id="ceo-core" priority={4} maxDist={48} fadeFrom={32} position={[0, 5.15, 0]}>
        <WorldName primary>AWAD</WorldName>
      </FloatingLabel>
    </group>
  );
}

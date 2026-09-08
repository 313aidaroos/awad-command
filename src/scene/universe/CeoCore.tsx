'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { requestCeoOpen } from '@/lib/ceoBridge';
import { KitBrushed } from '@/scene/materials/KitBrushed';
import { FloatingLabel } from '@/scene/ui/FloatingLabel';
import { WorldName } from '@/scene/ui/WorldName';
import { useCommandStore } from '@/store/useCommandStore';

function IntelligenceShell() {
  const gyro = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (gyro.current) gyro.current.rotation.y += dt * 0.045;
  });

  return (
    <group>
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.15, 2.4, 0.4, 48]} />
        <KitBrushed repeat={[14, 1]} grade="#B4B8C0" roughness={0.34} />
      </mesh>
      <mesh position={[0, 0.48, 0]}>
        <torusGeometry args={[2.05, 0.08, 12, 56]} />
        <KitBrushed repeat={[10, 0.5]} grade="#D0D4DA" roughness={0.26} />
      </mesh>
      <mesh position={[0, 2.85, 0]} castShadow>
        <octahedronGeometry args={[0.95, 0]} />
        <KitBrushed repeat={[3, 3]} grade="#6E737C" roughness={0.4} />
      </mesh>
      <group ref={gyro} position={[0, 2.85, 0]}>
        <mesh rotation={[1.32, 0, 0]} castShadow>
          <torusGeometry args={[2.7, 0.18, 16, 80]} />
          <KitBrushed repeat={[12, 0.6]} grade="#C5CAD3" roughness={0.3} />
        </mesh>
        <mesh rotation={[0.28, 1.1, 0.35]} castShadow>
          <torusGeometry args={[2.35, 0.14, 14, 72]} />
          <KitBrushed repeat={[10, 0.5]} grade="#A8AEB6" roughness={0.32} />
        </mesh>
        <mesh rotation={[1.02, 0.55, 1.05]} castShadow>
          <torusGeometry args={[2.05, 0.1, 12, 64]} />
          <KitBrushed repeat={[8, 0.4]} grade="#8A909A" roughness={0.34} />
        </mesh>
        <mesh rotation={[1.32, 0, 0]}>
          <torusGeometry args={[2.7, 0.02, 8, 64]} />
          <meshStandardMaterial color="#3D8BFF" emissive="#3D8BFF" emissiveIntensity={0.4} toneMapped={false} />
        </mesh>
      </group>
      <pointLight color="#D7DCE4" intensity={0.5} distance={13} position={[2.6, 5.2, 3.4]} />
      <pointLight color="#3D8BFF" intensity={0.14} distance={8} position={[0, 2.85, 0]} />
    </group>
  );
}

/** Wide PBR gyro — plaza focal mass. Textured metal, not a grey primitive. */
export function CeoCore() {
  const focused = useCommandStore((s) => s.focusedProject);
  const flyTo = useCommandStore((s) => s.flyTo);

  if (focused) return null;

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        flyTo({ position: [5.6, 3.7, 8.8], lookAt: [0, 2.4, 0], duration: 1.05, phase: 'universe' });
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
      <FloatingLabel id="ceo-core" priority={4} maxDist={48} fadeFrom={32} position={[0, 5.2, 0]}>
        <WorldName primary>AWAD</WorldName>
      </FloatingLabel>
    </group>
  );
}

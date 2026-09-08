'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { requestCeoOpen } from '@/lib/ceoBridge';
import { BrushedMetal } from '@/scene/materials/BrushedMetal';
import { FloatingLabel } from '@/scene/ui/FloatingLabel';
import { WorldName } from '@/scene/ui/WorldName';
import { useCommandStore } from '@/store/useCommandStore';

const FIN_COUNT = 10;
const FINS = Array.from({ length: FIN_COUNT }, (_, i) => (i / FIN_COUNT) * Math.PI * 2);

function IntelligenceShell() {
  const crown = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (crown.current) crown.current.rotation.y += dt * 0.035;
  });

  return (
    <group>
      <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.85, 2.05, 0.32, 10]} />
        <BrushedMetal color="#6E737C" roughness={0.38} />
      </mesh>
      <mesh position={[0, 2.05, 0]} castShadow>
        <cylinderGeometry args={[1.05, 1.22, 3.55, 10]} />
        <BrushedMetal color="#4A4F56" roughness={0.36} />
      </mesh>
      {FINS.map((a) => (
        <mesh key={a} position={[Math.sin(a) * 1.28, 2.15, Math.cos(a) * 1.28]} rotation={[0, a, 0]} castShadow>
          <boxGeometry args={[0.14, 3.7, 0.92]} />
          <BrushedMetal color="#8A909A" roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 1.35, 0]}>
        <torusGeometry args={[1.38, 0.07, 10, 40]} />
        <BrushedMetal color="#C5CAD3" roughness={0.24} />
      </mesh>
      <mesh position={[0, 2.85, 0]}>
        <torusGeometry args={[1.22, 0.055, 10, 40]} />
        <BrushedMetal color="#A8AEB6" roughness={0.26} />
      </mesh>
      <mesh position={[0, 1.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.38, 0.012, 8, 48]} />
        <meshStandardMaterial color="#3D8BFF" emissive="#3D8BFF" emissiveIntensity={0.55} toneMapped={false} />
      </mesh>
      <mesh position={[0, 2.85, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.22, 0.01, 8, 48]} />
        <meshStandardMaterial color="#3D8BFF" emissive="#3D8BFF" emissiveIntensity={0.4} toneMapped={false} />
      </mesh>
      <group ref={crown} position={[0, 4.15, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.72, 1.05, 0.85, 10]} />
          <BrushedMetal color="#9AA0A8" roughness={0.28} />
        </mesh>
        <mesh position={[0, 0.62, 0]} castShadow>
          <octahedronGeometry args={[0.62, 0]} />
          <BrushedMetal color="#C5CAD3" roughness={0.22} />
        </mesh>
        {FINS.filter((_, i) => i % 2 === 0).map((a) => (
          <mesh key={`c-${a}`} position={[Math.sin(a) * 0.82, 0.15, Math.cos(a) * 0.82]} rotation={[0.35, a, 0]}>
            <boxGeometry args={[0.08, 0.55, 0.42]} />
            <BrushedMetal color="#8A909A" roughness={0.3} />
          </mesh>
        ))}
      </group>
      <pointLight color="#D7DCE4" intensity={0.55} distance={12} position={[1.6, 4.4, 2.2]} />
      <pointLight color="#3D8BFF" intensity={0.18} distance={7} position={[0, 2.4, 0]} />
    </group>
  );
}

/** Large graphite/silver intelligence core. Focal mass from across the plaza. */
export function CeoCore() {
  const focused = useCommandStore((s) => s.focusedProject);
  const flyTo = useCommandStore((s) => s.flyTo);

  if (focused) return null;

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        flyTo({ position: [4.4, 3.15, 7.4], lookAt: [0, 2.35, 0], duration: 1.05, phase: 'universe' });
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
      <FloatingLabel id="ceo-core" priority={4} maxDist={48} fadeFrom={32} position={[0, 5.35, 0]}>
        <WorldName primary>AWAD</WorldName>
      </FloatingLabel>
    </group>
  );
}

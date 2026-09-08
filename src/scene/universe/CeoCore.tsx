'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { requestCeoOpen } from '@/lib/ceoBridge';
import { KitModel } from '@/scene/kit/KitModel';
import { FloatingLabel } from '@/scene/ui/FloatingLabel';
import { WorldName } from '@/scene/ui/WorldName';
import { useCommandStore } from '@/store/useCommandStore';

const STATIONS: Array<[number, number, number]> = [
  [1.7, 0, 0.55],
  [-1.65, 0, 0.7],
  [0.15, 0, -1.75],
  [1.45, 0, -1.15],
  [-1.35, 0, -1.2],
];

function IntelligenceHeart() {
  const spin = useRef<THREE.Group>(null);
  const level = useCommandStore((s) => s.quality.level);
  const rich = level !== 'low';

  useFrame((_, dt) => {
    if (spin.current) {
      spin.current.rotation.y += dt * 0.06;
      spin.current.rotation.x += dt * 0.018;
    }
  });

  return (
    <group position={[0, 1.15, 0]}>
      <mesh>
        <icosahedronGeometry args={[0.52, 1]} />
        <meshPhysicalMaterial
          color="#2A2E35"
          metalness={0.92}
          roughness={0.28}
          envMapIntensity={0.45}
          emissive="#1A2230"
          emissiveIntensity={0.22}
        />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[0.78, 1]} />
        {rich ? (
          <meshPhysicalMaterial
            color="#C9D0DA"
            metalness={0.12}
            roughness={0.1}
            transmission={0.62}
            thickness={0.55}
            ior={1.45}
            transparent
            opacity={0.88}
            envMapIntensity={0.5}
            attenuationColor="#8A909A"
            attenuationDistance={1.8}
            clearcoat={0.7}
            clearcoatRoughness={0.12}
          />
        ) : (
          <meshStandardMaterial
            color="#C9D0DA"
            metalness={0.35}
            roughness={0.16}
            transparent
            opacity={0.42}
            envMapIntensity={0.45}
          />
        )}
      </mesh>
      <group ref={spin}>
        <mesh rotation={[1.15, 0.2, 0.1]}>
          <torusGeometry args={[1.05, 0.012, 8, 64]} />
          <meshPhysicalMaterial color="#C5CAD3" metalness={0.9} roughness={0.2} envMapIntensity={0.5} />
        </mesh>
        <mesh rotation={[0.35, 1.1, 0.4]}>
          <torusGeometry args={[0.92, 0.01, 8, 56]} />
          <meshPhysicalMaterial color="#8A909A" metalness={0.86} roughness={0.24} envMapIntensity={0.45} />
        </mesh>
      </group>
      <pointLight color="#3D8BFF" intensity={0.28} distance={6} position={[0, 0.15, 0]} />
      <pointLight color="#D7DCE4" intensity={0.22} distance={5} position={[0.4, 0.8, 0.5]} />
    </group>
  );
}

/** Graphite/silver intelligence center — kit consoles around a glass core. Not a drum. */
export function CeoCore() {
  const focused = useCommandStore((s) => s.focusedProject);
  const flyTo = useCommandStore((s) => s.flyTo);

  if (focused) return null;

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        flyTo({ position: [0, 2.35, 6.4], lookAt: [0, 1.15, 0], duration: 1.05, phase: 'universe' });
        requestCeoOpen();
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'grab';
      }}
    >
      <IntelligenceHeart />
      {STATIONS.map(([x, y, z], i) => (
        <KitModel
          key={`st-${i}`}
          name={i % 2 === 0 ? 'computer' : 'accessPoint'}
          position={[x, y, z]}
          rotation={[0, Math.atan2(x, z) + Math.PI, 0]}
          scale={i % 2 === 0 ? 0.92 : 0.8}
          grade="#9AA0A8"
        />
      ))}
      <KitModel name="deskChair" metalize position={[2.05, 0, 0.95]} scale={1.55} rotation={[0, -2.2, 0]} grade="#7A8088" />
      <KitModel name="deskChair" metalize position={[-2.0, 0, 1.05]} scale={1.5} rotation={[0, 2.1, 0]} grade="#7A8088" />
      <FloatingLabel id="ceo-core" priority={4} maxDist={42} fadeFrom={28} position={[0, 2.65, 0]}>
        <WorldName primary>AWAD</WorldName>
      </FloatingLabel>
    </group>
  );
}

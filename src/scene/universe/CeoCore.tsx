'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { requestCeoOpen } from '@/lib/ceoBridge';
import { KitModel } from '@/scene/kit/KitModel';
import { FloatingLabel } from '@/scene/ui/FloatingLabel';
import { WorldName } from '@/scene/ui/WorldName';
import { useCommandStore } from '@/store/useCommandStore';

const STATIONS: Array<[number, number, number, number]> = [
  [1.55, 0, 0.95, 1.15],
  [-1.5, 0, 1.0, 1.12],
  [0.1, 0, -1.65, 1.15],
  [1.5, 0, -1.05, 1.0],
  [-1.45, 0, -1.05, 1.0],
  [0.1, 0, 1.7, 1.05],
  [1.7, 0, 0.05, 0.95],
  [-1.65, 0, 0.05, 0.95],
];

function IntelligenceHeart() {
  const spin = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.y += dt * 0.04;
  });

  return (
    <group position={[0, 1.15, 0]}>
      <mesh position={[0.22, 0.18, -0.12]} rotation={[0.4, 0.6, 0.1]}>
        <icosahedronGeometry args={[0.38, 0]} />
        <meshPhysicalMaterial color="#1A1D22" metalness={0.9} roughness={0.4} envMapIntensity={0.35} />
      </mesh>
      <mesh position={[-0.2, -0.08, 0.16]} rotation={[0.2, -0.5, 0.3]}>
        <icosahedronGeometry args={[0.34, 0]} />
        <meshPhysicalMaterial color="#2A2E35" metalness={0.88} roughness={0.36} envMapIntensity={0.35} />
      </mesh>
      <mesh rotation={[0.15, 0.4, 0.05]}>
        <icosahedronGeometry args={[0.78, 0]} />
        <meshPhysicalMaterial color="#3A3F47" metalness={0.86} roughness={0.34} envMapIntensity={0.38} />
      </mesh>
      <mesh rotation={[-0.2, 0.8, 0.15]}>
        <icosahedronGeometry args={[1.05, 0]} />
        <meshPhysicalMaterial
          color="#8A909A"
          metalness={0.8}
          roughness={0.22}
          transparent
          opacity={0.16}
          envMapIntensity={0.4}
        />
      </mesh>
      <group ref={spin}>
        <mesh rotation={[1.25, 0.1, 0.06]}>
          <torusGeometry args={[1.28, 0.012, 8, 72]} />
          <meshPhysicalMaterial color="#6E737C" metalness={0.84} roughness={0.28} envMapIntensity={0.35} />
        </mesh>
        <mesh rotation={[0.35, 1.15, 0.3]}>
          <torusGeometry args={[1.12, 0.009, 8, 64]} />
          <meshPhysicalMaterial color="#4A4F56" metalness={0.82} roughness={0.32} envMapIntensity={0.32} />
        </mesh>
      </group>
    </group>
  );
}

/** Dense console pit around a faceted graphite cluster. Not a lamp, drum, or scaffold. */
export function CeoCore() {
  const focused = useCommandStore((s) => s.focusedProject);
  const flyTo = useCommandStore((s) => s.flyTo);

  if (focused) return null;

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        flyTo({ position: [1.15, 1.55, 3.15], lookAt: [0, 1.05, 0], duration: 1.0, phase: 'universe' });
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
      {STATIONS.map(([x, y, z, scale], i) => (
        <KitModel
          key={`st-${i}`}
          name={i % 4 === 3 ? 'accessPoint' : 'computer'}
          position={[x, y, z]}
          rotation={[0, Math.atan2(x, z) + Math.PI, 0]}
          scale={scale}
          grade="#6E737C"
        />
      ))}
      <KitModel name="deskChair" metalize position={[2.05, 0, 1.25]} scale={1.55} rotation={[0, -2.35, 0]} grade="#5C6168" />
      <KitModel name="deskChair" metalize position={[-2.0, 0, 1.3]} scale={1.5} rotation={[0, 2.25, 0]} grade="#5C6168" />
      <KitModel name="deskComputer" metalize position={[0.15, 0, 2.15]} scale={1.9} rotation={[0, Math.PI, 0]} grade="#5C6168" />
      <FloatingLabel id="ceo-core" priority={4} maxDist={42} fadeFrom={28} position={[0, 2.55, 0]}>
        <WorldName primary>AWAD</WorldName>
      </FloatingLabel>
    </group>
  );
}

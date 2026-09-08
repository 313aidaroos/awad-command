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
  [1.45, 0, 0.85, 0.92],
  [-1.4, 0, 0.9, 0.9],
  [0.05, 0, -1.55, 0.92],
  [1.35, 0, -0.95, 0.8],
  [-1.3, 0, -0.95, 0.8],
  [0.05, 0, 1.55, 0.85],
];

function Graphite({ color, metalness, roughness }: { color: string; metalness: number; roughness: number }) {
  return <meshPhysicalMaterial color={color} metalness={metalness} roughness={roughness} envMapIntensity={0.4} />;
}

function IntelligenceHeart() {
  const spin = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.y += dt * 0.045;
  });

  return (
    <group position={[0, 1.05, 0]}>
      <mesh position={[0.08, 0.06, -0.05]}>
        <icosahedronGeometry args={[0.42, 0]} />
        <Graphite color="#1C1F24" metalness={0.9} roughness={0.38} />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[0.7, 0]} />
        <Graphite color="#3A3F47" metalness={0.88} roughness={0.32} />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[0.92, 1]} />
        <meshPhysicalMaterial
          color="#A8AEB6"
          metalness={0.82}
          roughness={0.18}
          transparent
          opacity={0.22}
          envMapIntensity={0.42}
        />
      </mesh>
      <group ref={spin}>
        <mesh rotation={[1.2, 0.15, 0.08]}>
          <torusGeometry args={[1.18, 0.01, 8, 72]} />
          <Graphite color="#8A909A" metalness={0.86} roughness={0.26} />
        </mesh>
        <mesh rotation={[0.4, 1.05, 0.35]}>
          <torusGeometry args={[1.02, 0.008, 8, 64]} />
          <Graphite color="#5C6168" metalness={0.84} roughness={0.3} />
        </mesh>
      </group>
      <pointLight color="#3D8BFF" intensity={0.1} distance={4.5} position={[0, 0.2, 0]} />
    </group>
  );
}

/** Calm graphite intelligence center. Faceted core + console pit. Not a drum, not a lamp. */
export function CeoCore() {
  const focused = useCommandStore((s) => s.focusedProject);
  const flyTo = useCommandStore((s) => s.flyTo);

  if (focused) return null;

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        flyTo({ position: [0, 1.85, 4.1], lookAt: [0, 1.05, 0], duration: 1.0, phase: 'universe' });
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
          name={i % 3 === 2 ? 'accessPoint' : 'computer'}
          position={[x, y, z]}
          rotation={[0, Math.atan2(x, z) + Math.PI, 0]}
          scale={scale}
          grade="#7A8088"
        />
      ))}
      <KitModel name="deskChair" metalize position={[1.85, 0, 1.15]} scale={1.45} rotation={[0, -2.3, 0]} grade="#6A7078" />
      <KitModel name="deskChair" metalize position={[-1.8, 0, 1.2]} scale={1.4} rotation={[0, 2.2, 0]} grade="#6A7078" />
      <FloatingLabel id="ceo-core" priority={4} maxDist={42} fadeFrom={28} position={[0, 2.35, 0]}>
        <WorldName primary>AWAD</WorldName>
      </FloatingLabel>
    </group>
  );
}

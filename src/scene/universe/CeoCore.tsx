'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { requestCeoOpen } from '@/lib/ceoBridge';
import { Anodized, Brushed, Graphite } from '@/scene/kit/materials';
import { Slit } from '@/scene/kit/parts';
import { pointerGate } from '@/scene/lib/pointer';
import { FloatingLabel } from '@/scene/ui/FloatingLabel';
import { WorldName } from '@/scene/ui/WorldName';
import { useCommandStore } from '@/store/useCommandStore';

const TICKS = 12;
const APERTURES = 8;

/** Layered dark-metal intelligence core — the plaza hero, not a drum. */
export function CeoCore() {
  const gyro = useRef<THREE.Group>(null);
  const shell = useRef<THREE.Group>(null);
  const hovered = useCommandStore((s) => s.hoveredProject === 'ceo');
  const hoverProject = useCommandStore((s) => s.hoverProject);
  const flyTo = useCommandStore((s) => s.flyTo);

  useFrame((_, dt) => {
    if (gyro.current) gyro.current.rotation.y += dt * 0.11;
    if (shell.current) shell.current.rotation.y -= dt * 0.035;
  });

  const openCeo = () => {
    if (pointerGate.suppressClick) return;
    flyTo({ position: [0, 2.15, 7.2], lookAt: [0, 1.45, 0], duration: 1.05, phase: 'universe' });
    requestCeoOpen();
  };

  return (
    <group
      position={[0, 0, 0]}
      onClick={(e) => {
        e.stopPropagation();
        openCeo();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        hoverProject('ceo');
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        hoverProject(undefined);
        document.body.style.cursor = 'grab';
      }}
    >
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[2.35, 2.55, 0.2, 12]} />
        <Graphite roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.24, 0]}>
        <cylinderGeometry args={[2.05, 2.18, 0.1, 12]} />
        <Brushed roughness={0.16} />
      </mesh>
      <mesh position={[0, 0.92, 0]}>
        <cylinderGeometry args={[1.62, 1.82, 1.28, 12]} />
        <Anodized roughness={0.16} />
      </mesh>
      {Array.from({ length: APERTURES }, (_, i) => {
        const a = (i / APERTURES) * Math.PI * 2;
        return (
          <mesh key={`ap-${i}`} position={[Math.cos(a) * 1.72, 0.95, Math.sin(a) * 1.72]} rotation={[0, -a, 0]}>
            <boxGeometry args={[0.08, 0.72, 0.34]} />
            <Brushed roughness={0.2} />
          </mesh>
        );
      })}
      <group ref={shell} position={[0, 1.15, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.58, 0.055, 10, 64]} />
          <Brushed roughness={0.12} />
        </mesh>
        <mesh rotation={[1.05, 0.4, 0.2]}>
          <torusGeometry args={[1.28, 0.03, 8, 48]} />
          <Brushed roughness={0.14} />
        </mesh>
      </group>
      {Array.from({ length: TICKS }, (_, i) => {
        const a = (i / TICKS) * Math.PI * 2;
        const long = i % 3 === 0;
        return (
          <mesh key={`tick-${i}`} position={[Math.cos(a) * 1.92, long ? 1.55 : 1.48, Math.sin(a) * 1.92]} rotation={[0, -a, 0]}>
            <boxGeometry args={[0.035, long ? 0.28 : 0.14, 0.045]} />
            <Brushed roughness={0.18} />
          </mesh>
        );
      })}
      <group ref={gyro} position={[0, 1.22, 0]}>
        <mesh>
          <cylinderGeometry args={[0.62, 0.62, 0.88, 16]} />
          <Anodized roughness={0.12} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.78, 0.04, 8, 48]} />
          <Brushed roughness={0.1} />
        </mesh>
        <mesh rotation={[0.9, 0.5, 0]}>
          <torusGeometry args={[0.52, 0.025, 8, 40]} />
          <Brushed roughness={0.12} />
        </mesh>
        <mesh>
          <octahedronGeometry args={[0.22, 0]} />
          <Brushed roughness={0.1} />
        </mesh>
      </group>
      <mesh position={[0, 1.78, 0]}>
        <cylinderGeometry args={[1.35, 1.55, 0.14, 12]} />
        <Brushed roughness={0.14} />
      </mesh>
      <mesh position={[0, 2.05, 0]}>
        <cylinderGeometry args={[0.48, 0.72, 0.42, 10]} />
        <Anodized roughness={0.14} />
      </mesh>
      <mesh position={[0, 2.32, 0]}>
        <cylinderGeometry args={[0.22, 0.38, 0.16, 8]} />
        <Brushed roughness={0.12} />
      </mesh>
      <Slit position={[0, 2.42, 0.2]} size={[0.28, 0.025, 0.025]} intensity={1.05} />
      {[-0.55, 0.55].map((z) => (
        <Slit key={z} position={[1.74, 0.95, z]} size={[0.02, 0.42, 0.02]} intensity={0.45} />
      ))}
      <mesh position={[0, 1.2, 0]} visible={false}>
        <sphereGeometry args={[2.4, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {hovered ? (
        <FloatingLabel id="ceo-core" priority={5} maxDist={40} fadeFrom={28} position={[0, 2.85, 0]}>
          <WorldName primary>CEO</WorldName>
        </FloatingLabel>
      ) : null}
    </group>
  );
}

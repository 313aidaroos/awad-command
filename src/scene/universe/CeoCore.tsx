'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { requestCeoOpen } from '@/lib/ceoBridge';
import { Anodized, Brushed, Graphite } from '@/scene/kit/materials';
import { Plinth, Slit } from '@/scene/kit/parts';
import { pointerGate } from '@/scene/lib/pointer';
import { FloatingLabel } from '@/scene/ui/FloatingLabel';
import { WorldName } from '@/scene/ui/WorldName';
import { useCommandStore } from '@/store/useCommandStore';

const TICKS = Array.from({ length: 24 }, (_, i) => (i / 24) * Math.PI * 2);

/** Multi-shell dark-metal intelligence core — gyroscope, not a tutorial sphere. */
export function CeoCore() {
  const inner = useRef<THREE.Group>(null);
  const mid = useRef<THREE.Group>(null);
  const hovered = useCommandStore((s) => s.hoveredProject === 'ceo');
  const hoverProject = useCommandStore((s) => s.hoverProject);
  const flyTo = useCommandStore((s) => s.flyTo);
  const quality = useCommandStore((s) => s.quality.level);

  useFrame((_, dt) => {
    if (inner.current) inner.current.rotation.y += dt * 0.18;
    if (mid.current) mid.current.rotation.y -= dt * 0.07;
  });

  const openCeo = () => {
    if (pointerGate.suppressClick) return;
    flyTo({ position: [0, 2.6, 8.4], lookAt: [0, 1.15, 0], duration: 1.1, phase: 'universe' });
    requestCeoOpen();
  };

  return (
    <group
      position={[0, 0.42, 0]}
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
      <Plinth size={[2.35, 0.18, 2.35]} steps={3} />
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.92, 1.05, 0.72, 8]} />
        <Anodized roughness={0.26} />
      </mesh>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.78, 0.82, 0.12, 8]} />
        <Brushed roughness={0.22} />
      </mesh>
      {[-0.55, 0, 0.55].map((x) => (
        <mesh key={x} position={[x, 0.95, 0]}>
          <boxGeometry args={[0.08, 1.15, 0.08]} />
          <Graphite roughness={0.32} />
        </mesh>
      ))}
      {[-0.55, 0, 0.55].map((z) => (
        <mesh key={`z${z}`} position={[0, 0.95, z]}>
          <boxGeometry args={[0.08, 1.15, 0.08]} />
          <Graphite roughness={0.32} />
        </mesh>
      ))}
      <group ref={mid} position={[0, 1.15, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.12, 0.028, 8, quality === 'low' ? 32 : 64]} />
          <Brushed roughness={0.18} />
        </mesh>
        <mesh rotation={[Math.PI / 2.4, 0.4, 0.2]}>
          <torusGeometry args={[0.92, 0.02, 8, quality === 'low' ? 28 : 56]} />
          <Brushed roughness={0.2} />
        </mesh>
      </group>
      <group ref={inner} position={[0, 1.15, 0]}>
        <mesh>
          <cylinderGeometry args={[0.42, 0.42, 0.55, 12]} />
          <Anodized roughness={0.18} />
        </mesh>
        <mesh>
          <octahedronGeometry args={[0.22, 0]} />
          <Brushed roughness={0.16} />
        </mesh>
        {[-0.18, 0, 0.18].map((y) => (
          <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.48, 0.48, 0.035, 16]} />
            <Graphite roughness={0.28} />
          </mesh>
        ))}
        {TICKS.filter((_, i) => quality === 'low' ? i % 2 === 0 : true).map((a) => (
          <mesh key={a} position={[Math.cos(a) * 0.62, 0, Math.sin(a) * 0.62]}>
            <boxGeometry args={[0.035, 0.09, 0.018]} />
            <Brushed roughness={0.22} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 1.72, 0]}>
        <boxGeometry args={[0.7, 0.06, 0.7]} />
        <Brushed roughness={0.2} />
      </mesh>
      <Slit position={[0, 1.76, 0.36]} size={[0.22, 0.012, 0.012]} intensity={0.85} />
      <Slit position={[0.36, 1.12, 0]} size={[0.012, 0.28, 0.012]} intensity={0.45} />
      <mesh position={[0, 1.15, 0]} visible={false}>
        <sphereGeometry args={[1.55, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {hovered ? (
        <FloatingLabel id="ceo-core" priority={5} maxDist={40} fadeFrom={28} position={[0, 2.35, 0]}>
          <WorldName primary>CEO</WorldName>
        </FloatingLabel>
      ) : null}
    </group>
  );
}

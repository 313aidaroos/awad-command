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

/** Dark-metal intelligence mass — reads as the plaza's focal architecture. */
export function CeoCore() {
  const inner = useRef<THREE.Group>(null);
  const hovered = useCommandStore((s) => s.hoveredProject === 'ceo');
  const hoverProject = useCommandStore((s) => s.hoverProject);
  const flyTo = useCommandStore((s) => s.flyTo);

  useFrame((_, dt) => {
    if (inner.current) inner.current.rotation.y += dt * 0.08;
  });

  const openCeo = () => {
    if (pointerGate.suppressClick) return;
    flyTo({ position: [0, 2.4, 8.4], lookAt: [0, 1.5, 0], duration: 1.1, phase: 'universe' });
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
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[2.15, 2.35, 0.24, 8]} />
        <Graphite roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[1.92, 2.05, 0.1, 8]} />
        <Brushed roughness={0.2} />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <cylinderGeometry args={[1.55, 1.72, 1.45, 8]} />
        <Anodized roughness={0.2} />
      </mesh>
      <mesh position={[0, 1.82, 0]}>
        <cylinderGeometry args={[1.38, 1.5, 0.18, 8]} />
        <Brushed roughness={0.16} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 8;
        return (
          <mesh key={i} position={[Math.cos(a) * 1.68, 1.35, Math.sin(a) * 1.68]}>
            <boxGeometry args={[0.22, 1.9, 0.22]} />
            <Graphite roughness={0.28} />
          </mesh>
        );
      })}
      <group ref={inner} position={[0, 1.28, 0]}>
        <mesh>
          <cylinderGeometry args={[0.72, 0.72, 0.95, 12]} />
          <Anodized roughness={0.14} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.92, 0.045, 8, 48]} />
          <Brushed roughness={0.14} />
        </mesh>
      </group>
      <mesh position={[0, 2.22, 0]}>
        <cylinderGeometry args={[0.55, 0.82, 0.28, 8]} />
        <Brushed roughness={0.18} />
      </mesh>
      <Slit position={[0, 2.38, 0.42]} size={[0.42, 0.03, 0.03]} intensity={1.05} />
      <mesh position={[0, 1.2, 0]} visible={false}>
        <sphereGeometry args={[2.2, 8, 8]} />
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

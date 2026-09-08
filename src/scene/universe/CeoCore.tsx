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

/** Dark-metal intelligence core — enough mass to read at plaza distance. */
export function CeoCore() {
  const inner = useRef<THREE.Group>(null);
  const mid = useRef<THREE.Group>(null);
  const hovered = useCommandStore((s) => s.hoveredProject === 'ceo');
  const hoverProject = useCommandStore((s) => s.hoverProject);
  const flyTo = useCommandStore((s) => s.flyTo);
  const quality = useCommandStore((s) => s.quality.level);

  useFrame((_, dt) => {
    if (inner.current) inner.current.rotation.y += dt * 0.14;
    if (mid.current) mid.current.rotation.y -= dt * 0.05;
  });

  const openCeo = () => {
    if (pointerGate.suppressClick) return;
    flyTo({ position: [0, 2.8, 9.2], lookAt: [0, 1.55, 0], duration: 1.1, phase: 'universe' });
    requestCeoOpen();
  };

  return (
    <group
      position={[0, 0.55, 0]}
      scale={1.42}
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
      <Plinth size={[3.1, 0.22, 3.1]} steps={3} />
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[1.22, 1.38, 1.05, 8]} />
        <Anodized roughness={0.24} />
      </mesh>
      <mesh position={[0, 1.12, 0]}>
        <cylinderGeometry args={[1.05, 1.12, 0.16, 8]} />
        <Brushed roughness={0.2} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh key={i} position={[Math.cos(a) * 1.32, 1.25, Math.sin(a) * 1.32]}>
            <boxGeometry args={[0.16, 1.7, 0.16]} />
            <Graphite roughness={0.3} />
          </mesh>
        );
      })}
      <group ref={mid} position={[0, 1.35, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.42, 0.045, 8, quality === 'low' ? 32 : 64]} />
          <Brushed roughness={0.16} />
        </mesh>
        <mesh rotation={[1.15, 0.35, 0.15]}>
          <torusGeometry args={[1.18, 0.032, 8, quality === 'low' ? 28 : 56]} />
          <Brushed roughness={0.18} />
        </mesh>
      </group>
      <group ref={inner} position={[0, 1.35, 0]}>
        <mesh>
          <cylinderGeometry args={[0.58, 0.58, 0.72, 12]} />
          <Anodized roughness={0.16} />
        </mesh>
        <mesh>
          <octahedronGeometry args={[0.32, 0]} />
          <Brushed roughness={0.14} />
        </mesh>
        {[-0.22, 0.22].map((y) => (
          <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.68, 0.68, 0.05, 16]} />
            <Graphite roughness={0.26} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 2.05, 0]}>
        <boxGeometry args={[0.95, 0.1, 0.95]} />
        <Brushed roughness={0.18} />
      </mesh>
      <Slit position={[0, 2.12, 0.48]} size={[0.36, 0.02, 0.02]} intensity={0.95} />
      <mesh position={[0, 1.35, 0]} visible={false}>
        <sphereGeometry args={[1.9, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {hovered ? (
        <FloatingLabel id="ceo-core" priority={5} maxDist={40} fadeFrom={28} position={[0, 2.7, 0]}>
          <WorldName primary>CEO</WorldName>
        </FloatingLabel>
      ) : null}
    </group>
  );
}

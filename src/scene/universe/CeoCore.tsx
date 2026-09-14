'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { requestCeoOpen } from '@/lib/ceoBridge';
import { ChassisMaterial } from '@/scene/materials/ChassisMaterial';
import { SilverMaterial } from '@/scene/materials/SilverMaterial';
import { HitSphere } from '@/scene/universe/HitSphere';
import { pointerGate } from '@/scene/lib/pointer';
import { useCommandStore } from '@/store/useCommandStore';

export function CeoCore() {
  const ring = useRef<THREE.Group>(null);
  const flyTo = useCommandStore((s) => s.flyTo);

  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.y += dt * 0.012;
  });

  const openCeo = () => {
    if (pointerGate.suppressClick) return;
    flyTo({ position: [0, 2.4, 9.2], lookAt: [0, 0.4, 0], duration: 1.15, phase: 'universe' });
    requestCeoOpen();
  };

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        openCeo();
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'grab';
      }}
    >
      <HitSphere radius={2.55} />
      <mesh>
        <sphereGeometry args={[2.22, 64, 48]} />
        <ChassisMaterial roughness={0.42} />
      </mesh>
      <group ref={ring}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.42, 0.018, 8, 96]} />
          <SilverMaterial roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
}

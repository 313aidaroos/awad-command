'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { requestCeoOpen } from '@/lib/ceoBridge';
import { KitModel } from '@/scene/kit/KitModel';
import { FloatingLabel } from '@/scene/ui/FloatingLabel';
import { WorldName } from '@/scene/ui/WorldName';
import { useCommandStore } from '@/store/useCommandStore';

/** Multi-part GLTF command core — stacked rocket + dishes. Not a drum. */
export function CeoCore() {
  const spin = useRef<THREE.Group>(null);
  const focused = useCommandStore((s) => s.focusedProject);
  const flyTo = useCommandStore((s) => s.flyTo);

  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.y += dt * 0.08;
  });

  if (focused) return null;

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        flyTo({ position: [0, 3.15, 11], lookAt: [0, 1.2, 0], duration: 1.1, phase: 'universe' });
        requestCeoOpen();
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'grab';
      }}
    >
      <KitModel name="rocketBase" metalize scale={2.6} />
      <KitModel name="rocketFuel" metalize position={[0, 1.7, 0]} scale={2.35} />
      <KitModel name="rocketSides" metalize position={[0, 0.4, 0]} scale={2.4} />
      <KitModel name="rocketFins" metalize position={[0, 0.12, 0]} scale={2.45} />
      <KitModel name="rocketTop" metalize position={[0, 3.35, 0]} scale={2.2} />
      <group ref={spin}>
        <KitModel name="dishDetailed" metalize position={[1.95, 2.45, 0.2]} scale={1.7} rotation={[0.35, 0.4, 0]} />
        <KitModel name="dish" metalize position={[-1.7, 2.25, 1.15]} scale={1.55} rotation={[0.2, -0.8, 0]} />
        <KitModel name="dishLarge" metalize position={[-0.1, 2.7, -1.85]} scale={1.45} rotation={[0.15, 2.4, 0]} />
      </group>
      <KitModel name="gateComplex" metalize position={[0, 0, 2.35]} scale={1.9} />
      <pointLight color="#e8edf4" intensity={2.2} distance={14} position={[0, 3.6, 1.2]} />
      <pointLight color="#3D8BFF" intensity={0.4} distance={10} position={[0, 2.2, 0]} />
      <FloatingLabel id="ceo-core" priority={4} maxDist={42} fadeFrom={28} position={[0, 4.75, 0]}>
        <WorldName primary>AWAD</WorldName>
      </FloatingLabel>
    </group>
  );
}

'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { requestCeoOpen } from '@/lib/ceoBridge';
import { KitModel } from '@/scene/kit/KitModel';
import { FloatingLabel } from '@/scene/ui/FloatingLabel';
import { WorldName } from '@/scene/ui/WorldName';
import { useCommandStore } from '@/store/useCommandStore';

/** Multi-part GLTF command core — rocket stack + dishes + hangar ring. Not a drum. */
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
      <KitModel name="rocketBase" metalize tint="#c9ced6" scale={2.35} />
      <KitModel name="rocketFuel" metalize tint="#d5dae2" position={[0, 1.55, 0]} scale={2.15} />
      <KitModel name="rocketSides" metalize tint="#b7bdc6" position={[0, 0.35, 0]} scale={2.2} />
      <KitModel name="rocketFins" metalize tint="#3D8BFF" position={[0, 0.15, 0]} scale={2.25} />
      <KitModel name="rocketTop" metalize tint="#e6e8ec" position={[0, 3.15, 0]} scale={2.05} />
      <group ref={spin}>
        <KitModel name="hangarRoundGlass" metalize tint="#9aa7b8" position={[0, 1.85, 0]} scale={3.4} />
        <KitModel name="dishDetailed" metalize tint="#dfe4ee" position={[1.85, 2.35, 0.15]} scale={1.55} rotation={[0.35, 0.4, 0]} />
        <KitModel name="dish" metalize tint="#cfd6e0" position={[-1.55, 2.15, 1.05]} scale={1.45} rotation={[0.2, -0.8, 0]} />
        <KitModel name="dishLarge" metalize tint="#d7dce4" position={[-0.15, 2.55, -1.7]} scale={1.35} rotation={[0.15, 2.4, 0]} />
      </group>
      <KitModel name="gateComplex" metalize tint="#8A909A" position={[0, 0, 2.15]} scale={1.8} />
      <pointLight color="#e8edf4" intensity={2.4} distance={14} position={[0, 3.4, 1.2]} />
      <pointLight color="#3D8BFF" intensity={0.55} distance={10} position={[0, 2.2, 0]} />
      <FloatingLabel id="ceo-core" priority={4} maxDist={42} fadeFrom={28} position={[0, 4.55, 0]}>
        <WorldName primary>AWAD</WorldName>
      </FloatingLabel>
    </group>
  );
}

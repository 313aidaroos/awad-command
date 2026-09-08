'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { requestCeoOpen } from '@/lib/ceoBridge';
import { KitModel } from '@/scene/kit/KitModel';
import { FloatingLabel } from '@/scene/ui/FloatingLabel';
import { WorldName } from '@/scene/ui/WorldName';
import { useCommandStore } from '@/store/useCommandStore';

/** Multi-part MegaKit command core — columns, pipes, consoles. Not a drum. */
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
      <KitModel name="floorMetal" scale={0.85} />
      <KitModel name="columnLarge" scale={0.95} />
      <KitModel name="columnAstra" position={[0, 0, 0]} scale={0.72} />
      <KitModel name="columnPipes" position={[0.85, 0, 0.15]} scale={0.55} />
      <KitModel name="columnPipes" position={[-0.85, 0, -0.15]} scale={0.55} rotation={[0, Math.PI, 0]} />
      <KitModel name="columnRound" position={[0.15, 0, -0.95]} scale={0.7} />
      <KitModel name="columnHollow" position={[-0.2, 0, 0.95]} scale={0.65} />
      <KitModel name="computer" position={[1.15, 0, 0.85]} scale={0.95} rotation={[0, -0.6, 0]} />
      <KitModel name="computer" position={[-1.1, 0, -0.75]} scale={0.9} rotation={[0, 2.3, 0]} />
      <KitModel name="accessPoint" position={[1.35, 0, -0.55]} scale={0.85} />
      <KitModel name="deskComputer" metalize position={[-1.25, 0, 0.7]} scale={1.7} rotation={[0, 0.8, 0]} />
      <group ref={spin}>
        <KitModel name="dishDetailed" metalize position={[1.55, 2.55, 0.15]} scale={1.35} rotation={[0.35, 0.4, 0]} />
        <KitModel name="dish" metalize position={[-1.4, 2.35, 0.95]} scale={1.2} rotation={[0.2, -0.8, 0]} />
        <KitModel name="dishLarge" metalize position={[0.1, 2.75, -1.45]} scale={1.15} rotation={[0.15, 2.4, 0]} />
      </group>
      <KitModel name="lightWide" position={[0, 3.35, 0]} sit={false} />
      <pointLight color="#e8edf4" intensity={2.4} distance={14} position={[0, 3.6, 1.2]} />
      <pointLight color="#3D8BFF" intensity={0.45} distance={10} position={[0, 2.2, 0]} />
      <FloatingLabel id="ceo-core" priority={4} maxDist={42} fadeFrom={28} position={[0, 4.55, 0]}>
        <WorldName primary>AWAD</WorldName>
      </FloatingLabel>
    </group>
  );
}

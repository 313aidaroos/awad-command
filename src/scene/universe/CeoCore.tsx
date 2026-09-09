'use client';

import { requestCeoOpen } from '@/lib/ceoBridge';
import { CEO_CLOSE_CAM } from '@/scene/lib/cameraPaths';
import { KitModel } from '@/scene/kit/KitModel';
import { BrushedMetal } from '@/scene/materials/BrushedMetal';
import { FloatingLabel } from '@/scene/ui/FloatingLabel';
import { WorldName } from '@/scene/ui/WorldName';
import { useCommandStore } from '@/store/useCommandStore';
import * as THREE from 'three';

/** One turned volume: slight taper, mid waist, crown dish. Not two boxes. */
const HULL = [
  new THREE.Vector2(1.68, 0),
  new THREE.Vector2(1.68, 0.08),
  new THREE.Vector2(1.56, 1.52),
  new THREE.Vector2(1.44, 2.06),
  new THREE.Vector2(1.18, 2.2),
  new THREE.Vector2(1.12, 2.38),
  new THREE.Vector2(1.18, 2.56),
  new THREE.Vector2(1.32, 2.9),
  new THREE.Vector2(1.08, 4.52),
  new THREE.Vector2(0.7, 4.7),
  new THREE.Vector2(0.22, 4.82),
];

function IntelligenceCore() {
  return (
    <group scale={1.08}>
      <mesh castShadow receiveShadow>
        <latheGeometry args={[HULL, 72]} />
        <BrushedMetal />
      </mesh>

      <mesh position={[0, 2.38, 0]}>
        <cylinderGeometry args={[1.13, 1.13, 0.3, 48]} />
        <meshStandardMaterial color="#08090C" roughness={0.96} metalness={0.1} />
      </mesh>

      <mesh position={[0, 2.38, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.2, 0.03, 12, 64]} />
        <meshStandardMaterial color="#3D8BFF" emissive="#3D8BFF" emissiveIntensity={0.82} toneMapped={false} />
      </mesh>

      <KitModel name="decalLogo" position={[0, 1.32, 1.58]} sit={false} scale={0.48} grade="#D8DCE0" />

      <pointLight color="#F4F6F8" intensity={1.35} distance={16} position={[2.6, 6.1, 4.8]} />
      <pointLight color="#3D8BFF" intensity={0.4} distance={7} position={[0, 2.38, 0]} />
      <pointLight color="#D4DAE2" intensity={0.36} distance={8} position={[-2.0, 4.5, -1.6]} />
    </group>
  );
}

/** One tapered brushed volume, mid well + one ring. Not stacked boxes. */
export function CeoCore() {
  const focused = useCommandStore((s) => s.focusedProject);
  const flyTo = useCommandStore((s) => s.flyTo);

  if (focused) return null;

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        flyTo({ ...CEO_CLOSE_CAM });
        requestCeoOpen();
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'grab';
      }}
    >
      <IntelligenceCore />
      <FloatingLabel id="ceo-core" priority={4} maxDist={48} fadeFrom={32} position={[0, 5.55, 0]}>
        <WorldName primary>AWAD</WorldName>
      </FloatingLabel>
    </group>
  );
}

'use client';

import { ContactShadows } from '@react-three/drei';
import { KitModel } from '@/scene/kit/KitModel';

/** Dark field plus one greebled plate — not a tile island, not a blank disc. */
export function PlazaDeck() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[22, 64]} />
        <meshPhysicalMaterial color="#08090C" metalness={0.55} roughness={0.82} envMapIntensity={0.18} />
      </mesh>
      <KitModel name="floorDark" scale={5.1} grade="#3A3E46" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
        <ringGeometry args={[7.35, 7.48, 80]} />
        <meshPhysicalMaterial color="#2A2E35" metalness={0.78} roughness={0.4} envMapIntensity={0.28} />
      </mesh>
      <ContactShadows position={[0, 0.012, 0]} opacity={0.66} scale={26} blur={2.6} far={6} color="#000000" />
    </group>
  );
}

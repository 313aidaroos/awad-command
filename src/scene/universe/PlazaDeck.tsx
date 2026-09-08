'use client';

import { ContactShadows } from '@react-three/drei';

/** Continuous graphite field — not a tiled slab island, no trusses. */
export function PlazaDeck() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.012, 0]} receiveShadow>
        <circleGeometry args={[20, 64]} />
        <meshPhysicalMaterial color="#0C0E12" metalness={0.62} roughness={0.78} envMapIntensity={0.22} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} receiveShadow>
        <ringGeometry args={[7.6, 7.72, 80]} />
        <meshPhysicalMaterial color="#3A3F47" metalness={0.8} roughness={0.35} envMapIntensity={0.3} />
      </mesh>
      <ContactShadows position={[0, 0.01, 0]} opacity={0.62} scale={28} blur={2.8} far={6} color="#000000" />
    </group>
  );
}

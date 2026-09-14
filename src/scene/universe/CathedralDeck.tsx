'use client';

import { ContactShadows } from '@react-three/drei';
import { Brushed, FloorMetal } from '@/scene/kit/materials';

/** Quiet plaza disc — glossy floor + soft contact under the CEO. */
export function CathedralDeck() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <circleGeometry args={[22, 80]} />
        <FloorMetal roughness={0.3} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <ringGeometry args={[9.6, 9.78, 80]} />
        <Brushed roughness={0.14} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[5.6, 72]} />
        <FloorMetal roughness={0.24} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[5.42, 5.6, 72]} />
        <Brushed roughness={0.1} />
      </mesh>
      <ContactShadows position={[0, -0.09, 0]} opacity={0.38} scale={18} blur={2.6} far={8} color="#000000" />
    </group>
  );
}

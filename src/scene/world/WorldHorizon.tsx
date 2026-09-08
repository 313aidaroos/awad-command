'use client';

import { DoubleSide } from 'three';

export function WorldHorizon({ accent }: { accent: string }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.1, 0]}>
        <ringGeometry args={[6.8, 10.6, 64]} />
        <meshBasicMaterial color={accent} transparent opacity={0.07} side={DoubleSide} />
      </mesh>
      <mesh rotation={[1.2, 0.2, 0.1]}>
        <torusGeometry args={[9.4, 0.012, 8, 80]} />
        <meshBasicMaterial color={accent} transparent opacity={0.12} />
      </mesh>
    </group>
  );
}

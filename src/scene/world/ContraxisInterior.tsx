'use client';

import { ChassisMaterial } from '@/scene/materials/ChassisMaterial';
import { SilverMaterial } from '@/scene/materials/SilverMaterial';

/** Contraxis nave: walkway, piers, far altar wall. Stations live on the node bays. */
export function ContraxisInterior() {
  return (
    <group>
      <mesh position={[0.6, -3.14, 0]}>
        <boxGeometry args={[20.2, 0.04, 1.38]} />
        <meshStandardMaterial color="#14181E" metalness={0.2} roughness={0.74} />
      </mesh>
      {[-5.4, -1.8, 1.8, 5.4].flatMap((x) =>
        ([-1.82, 1.82] as const).map((z) => (
          <mesh key={`${x}:${z}`} position={[x, -0.55, z]}>
            <boxGeometry args={[0.36, 5.2, 0.36]} />
            <ChassisMaterial roughness={0.5} />
          </mesh>
        )),
      )}
      <mesh position={[9.55, -1.55, 0]}>
        <boxGeometry args={[1.15, 3.2, 4.8]} />
        <ChassisMaterial roughness={0.46} />
      </mesh>
      <mesh position={[9.0, -0.35, 0]}>
        <boxGeometry args={[0.08, 0.9, 1.15]} />
        <SilverMaterial roughness={0.22} />
      </mesh>
    </group>
  );
}

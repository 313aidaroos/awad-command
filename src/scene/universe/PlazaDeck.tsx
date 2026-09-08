'use client';

import { ContactShadows } from '@react-three/drei';
import { KitModel } from '@/scene/kit/KitModel';

const TILES: Array<[number, number]> = [];
for (let x = -2; x <= 2; x += 1) {
  for (let z = -2; z <= 2; z += 1) {
    if (Math.hypot(x, z) > 2.35) continue;
    TILES.push([x * 4, z * 4]);
  }
}

/** Quiet graphite deck. Ships sit on it — no truss corners, no pipe towers. */
export function PlazaDeck() {
  return (
    <group>
      {TILES.map(([x, z]) => (
        <KitModel key={`${x}:${z}`} name="floorDark" position={[x, 0, z]} grade="#5C6168" />
      ))}
      <ContactShadows position={[0, 0.01, 0]} opacity={0.55} scale={32} blur={2.6} far={7} color="#000000" />
    </group>
  );
}

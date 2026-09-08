'use client';

import { ContactShadows } from '@react-three/drei';
import { KitModel } from '@/scene/kit/KitModel';

const TILES: Array<[number, number]> = [];
for (let x = -3; x <= 3; x += 1) {
  for (let z = -3; z <= 3; z += 1) {
    if (Math.abs(x) + Math.abs(z) > 5) continue;
    TILES.push([x * 4, z * 4]);
  }
}

/** Refined plaza deck — MegaKit metal plates, no orbit rings. */
export function PlazaDeck() {
  return (
    <group>
      {TILES.map(([x, z]) => (
        <KitModel key={`${x}:${z}`} name={Math.abs(x + z) % 3 === 0 ? 'floorDark' : 'floorMetal'} position={[x, 0, z]} />
      ))}
      {([-8, 8] as const).map((x) =>
        ([-8, 8] as const).map((z) => (
          <KitModel key={`col-${x}-${z}`} name="columnSupport" position={[x, 0, z]} scale={0.85} />
        )),
      )}
      <KitModel name="columnPipes" position={[0, 0, 6.4]} rotation={[0, Math.PI / 2, 0]} scale={0.7} />
      <KitModel name="columnPipes" position={[0, 0, -6.4]} rotation={[0, -Math.PI / 2, 0]} scale={0.7} />
      <ContactShadows position={[0, 0.01, 0]} opacity={0.42} scale={36} blur={2.2} far={8} color="#000000" />
    </group>
  );
}

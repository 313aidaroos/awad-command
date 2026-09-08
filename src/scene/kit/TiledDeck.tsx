'use client';

import { useMemo } from 'react';
import { Instance, Instances } from '@react-three/drei';
import { useCommandStore } from '@/store/useCommandStore';
import { Graphite } from '@/scene/kit/materials';

/** Tiled graphite deck — density from many small plates, not one disc. */
export function TiledDeck({
  radius = 18,
  tile = 1.15,
  y = 0,
}: {
  radius?: number;
  tile?: number;
  y?: number;
}) {
  const level = useCommandStore((s) => s.quality.level);
  const gap = 0.04;
  const cells = useMemo(() => {
    const list: Array<[number, number]> = [];
    const n = Math.ceil((radius * 2) / (tile + gap));
    const max = level === 'high' ? n : level === 'medium' ? Math.ceil(n * 0.78) : Math.ceil(n * 0.55);
    const r2 = radius * radius;
    for (let ix = -max; ix <= max; ix += 1) {
      for (let iz = -max; iz <= max; iz += 1) {
        const x = ix * (tile + gap);
        const z = iz * (tile + gap);
        if (x * x + z * z > r2) continue;
        list.push([x, z]);
      }
    }
    return list;
  }, [radius, tile, gap, level]);

  return (
    <Instances limit={cells.length + 2} range={cells.length} position={[0, y, 0]} frustumCulled={false}>
      <boxGeometry args={[tile, 0.07, tile]} />
      <Graphite roughness={0.56} metalness={0.4} />
      {cells.map(([x, z]) => (
        <Instance key={`${x}:${z}`} position={[x, 0, z]} />
      ))}
    </Instances>
  );
}

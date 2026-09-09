'use client';

import { useMemo } from 'react';
import { useCommandStore } from '@/store/useCommandStore';

export function DragonBalls() {
  const level = useCommandStore((s) => s.quality.level);
  const mode = useCommandStore((s) => s.shenronMode);
  const balls = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2 + 0.4;
        const r = 11 + (i % 3);
        return {
          p: [Math.cos(a) * r, 6.5 + (i % 4) * 1.1, Math.sin(a) * r] as [number, number, number],
        };
      }),
    [],
  );
  if (level === 'low') return null;
  return (
    <group>
      {balls.map((b, i) => (
        <mesh key={i} position={b.p}>
          <sphereGeometry args={[0.38, 14, 12]} />
          <meshPhysicalMaterial
            color="#F5A020"
            emissive="#F59E0B"
            emissiveIntensity={mode ? 1.1 : 0.55}
            roughness={0.28}
            metalness={0.15}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

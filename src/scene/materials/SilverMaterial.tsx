'use client';

import { useCommandStore } from '@/store/useCommandStore';

const SILVER = '#D7DCE5';

export function SilverMaterial({ roughness = 0.16 }: { roughness?: number }) {
  const level = useCommandStore((s) => s.quality.level);
  if (level === 'low') {
    return <meshStandardMaterial color={SILVER} metalness={0.96} roughness={roughness + 0.08} />;
  }
  return (
    <meshPhysicalMaterial
      color={SILVER}
      metalness={1}
      roughness={roughness}
      clearcoat={0.7}
      clearcoatRoughness={0.12}
      envMapIntensity={level === 'high' ? 1.05 : 0.7}
    />
  );
}

'use client';

import { useCommandStore } from '@/store/useCommandStore';

const SILVER = '#C5CBD4';

export function SilverMaterial({ roughness = 0.28 }: { roughness?: number }) {
  const level = useCommandStore((s) => s.quality.level);
  if (level === 'low') {
    return <meshStandardMaterial color={SILVER} metalness={0.72} roughness={roughness} />;
  }
  return (
    <meshPhysicalMaterial
      color={SILVER}
      metalness={0.78}
      roughness={roughness}
      clearcoat={0.35}
      clearcoatRoughness={0.28}
      envMapIntensity={level === 'high' ? 0.45 : 0.3}
    />
  );
}

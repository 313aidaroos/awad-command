'use client';

import { useCommandStore } from '@/store/useCommandStore';

const GRAPHITE = '#14181E';

export function ChassisMaterial({ roughness = 0.28 }: { roughness?: number }) {
  const level = useCommandStore((s) => s.quality.level);
  if (level === 'low') {
    return <meshStandardMaterial color={GRAPHITE} metalness={0.88} roughness={roughness + 0.06} />;
  }
  return (
    <meshPhysicalMaterial
      color={GRAPHITE}
      metalness={0.94}
      roughness={roughness}
      clearcoat={0.48}
      clearcoatRoughness={0.32}
      envMapIntensity={level === 'high' ? 0.82 : 0.52}
    />
  );
}

'use client';

import { useCommandStore } from '@/store/useCommandStore';

/** Graphite that still reads as a solid on a void background — not chrome, not candy glass. */
const GRAPHITE = '#454C57';

export function ChassisMaterial({ roughness = 0.4 }: { roughness?: number }) {
  const level = useCommandStore((s) => s.quality.level);
  if (level === 'low') {
    return <meshStandardMaterial color={GRAPHITE} metalness={0.55} roughness={roughness} />;
  }
  return (
    <meshPhysicalMaterial
      color={GRAPHITE}
      metalness={0.58}
      roughness={roughness}
      clearcoat={0.22}
      clearcoatRoughness={0.45}
      envMapIntensity={level === 'high' ? 0.32 : 0.22}
    />
  );
}

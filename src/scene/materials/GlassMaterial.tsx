'use client';

import { useCommandStore } from '@/store/useCommandStore';

export function GlassMaterial({
  accent,
  opacity = 0.58,
  emissive = 0.07,
}: {
  accent: string;
  opacity?: number;
  emissive?: number;
}) {
  const level = useCommandStore((s) => s.quality.level);
  if (level === 'low') {
    return (
      <meshStandardMaterial
        color={accent}
        metalness={0.42}
        roughness={0.28}
        transparent
        opacity={opacity}
        emissive={accent}
        emissiveIntensity={emissive}
      />
    );
  }
  return (
    <meshPhysicalMaterial
      color={accent}
      metalness={level === 'high' ? 0.22 : 0.28}
      roughness={level === 'high' ? 0.08 : 0.14}
      clearcoat={level === 'high' ? 0.86 : 0.62}
      clearcoatRoughness={level === 'high' ? 0.08 : 0.16}
      transparent
      opacity={opacity}
      emissive={accent}
      emissiveIntensity={emissive}
      reflectivity={0.55}
    />
  );
}

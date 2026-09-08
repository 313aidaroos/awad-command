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
      metalness={level === 'high' ? 0.14 : 0.2}
      roughness={level === 'high' ? 0.1 : 0.16}
      clearcoat={level === 'high' ? 0.78 : 0.52}
      clearcoatRoughness={level === 'high' ? 0.12 : 0.2}
      transparent
      opacity={opacity}
      emissive={accent}
      emissiveIntensity={emissive}
      reflectivity={0.55}
    />
  );
}

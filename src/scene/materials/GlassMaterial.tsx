'use client';

import { useCommandStore } from '@/store/useCommandStore';

export function GlassMaterial({
  accent,
  opacity = 0.7,
  emissive = 0.06,
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
        metalness={0.52}
        roughness={0.18}
        transparent
        opacity={Math.min(1, opacity + 0.1)}
        emissive={accent}
        emissiveIntensity={emissive}
      />
    );
  }
  return (
    <meshPhysicalMaterial
      color={accent}
      metalness={0.26}
      roughness={0.055}
      clearcoat={1}
      clearcoatRoughness={0.04}
      ior={1.5}
      reflectivity={0.78}
      thickness={0.72}
      attenuationDistance={2.1}
      attenuationColor={accent}
      envMapIntensity={0.55}
      transparent
      opacity={opacity}
      emissive={accent}
      emissiveIntensity={emissive}
      specularIntensity={1}
    />
  );
}

'use client';

/** Graphite / silver studio metal. Rough enough to read as brushed, not a white blowout. */
export function BrushedMetal({
  color = '#8A909A',
  roughness = 0.34,
  metalness = 0.9,
}: {
  color?: string;
  roughness?: number;
  metalness?: number;
}) {
  return (
    <meshPhysicalMaterial
      color={color}
      metalness={metalness}
      roughness={roughness}
      envMapIntensity={0.52}
      clearcoat={0.18}
      clearcoatRoughness={0.45}
    />
  );
}

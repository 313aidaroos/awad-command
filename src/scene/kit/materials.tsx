'use client';

import { useCommandStore } from '@/store/useCommandStore';

/** Graphite chassis — the cathedral mass. */
export function Graphite({ roughness = 0.42, metalness = 0.62 }: { roughness?: number; metalness?: number }) {
  const low = useCommandStore((s) => s.quality.level === 'low');
  return (
    <meshStandardMaterial
      color="#22272E"
      metalness={low ? Math.min(0.55, metalness) : metalness}
      roughness={roughness}
      envMapIntensity={1.15}
    />
  );
}

/** Brushed silver trim, frames, capitals. */
export function Brushed({ roughness = 0.28 }: { roughness?: number }) {
  return (
    <meshStandardMaterial
      color="#D8DDE4"
      metalness={0.92}
      roughness={roughness}
      envMapIntensity={1.25}
    />
  );
}

/** Darker anodized metal for inner mechanisms. */
export function Anodized({ roughness = 0.22 }: { roughness?: number }) {
  return (
    <meshStandardMaterial
      color="#171B21"
      metalness={0.94}
      roughness={roughness}
      envMapIntensity={1.1}
    />
  );
}

/** Architectural glass — tinted, not toy transparency. */
export function GlassPanel({
  accent = '#8A909A',
  opacity = 0.22,
}: {
  accent?: string;
  opacity?: number;
}) {
  const level = useCommandStore((s) => s.quality.level);
  if (level === 'low') {
    return (
      <meshStandardMaterial
        color="#1C222C"
        metalness={0.55}
        roughness={0.18}
        transparent
        opacity={0.72}
        envMapIntensity={0.7}
      />
    );
  }
  return (
    <meshPhysicalMaterial
      color="#1B2028"
      metalness={0.12}
      roughness={0.08}
      transmission={level === 'high' ? 0.42 : 0}
      thickness={0.35}
      ior={1.48}
      transparent
      opacity={opacity}
      envMapIntensity={1.15}
      clearcoat={1}
      clearcoatRoughness={0.08}
      attenuationColor={accent}
      attenuationDistance={2.4}
    />
  );
}

/** Narrow emissive slit — the only glow allowed. */
export function LitSlit({ accent = '#3D8BFF', intensity = 0.7 }: { accent?: string; intensity?: number }) {
  return (
    <meshStandardMaterial
      color={accent}
      emissive={accent}
      emissiveIntensity={intensity}
      metalness={0.2}
      roughness={0.35}
      toneMapped
    />
  );
}

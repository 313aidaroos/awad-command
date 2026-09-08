'use client';

export function AccentGlow({ accent, opacity = 0.7 }: { accent: string; opacity?: number }) {
  return (
    <meshStandardMaterial
      color={accent}
      emissive={accent}
      emissiveIntensity={0.55 * opacity}
      metalness={0.2}
      roughness={0.38}
    />
  );
}

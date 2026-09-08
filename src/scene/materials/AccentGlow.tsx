'use client';

/** Unlit accent so slits and cores read on Safari without bloom. */
export function AccentGlow({ accent, opacity = 0.88 }: { accent: string; opacity?: number }) {
  return <meshBasicMaterial color={accent} transparent opacity={opacity} toneMapped={false} depthWrite={false} />;
}

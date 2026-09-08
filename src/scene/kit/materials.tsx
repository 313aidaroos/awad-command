'use client';

import * as THREE from 'three';
import { usePbrSuite } from '@/scene/kit/pbrMaps';
import { useCommandStore } from '@/store/useCommandStore';

/** Graphite chassis — brushed PBR, not a matte slab. */
export function Graphite({ roughness = 0.38, metalness = 0.72 }: { roughness?: number; metalness?: number }) {
  const low = useCommandStore((s) => s.quality.level === 'low');
  const suite = usePbrSuite();
  return (
    <meshStandardMaterial
      color="#3A424C"
      map={suite?.graphiteAlbedo}
      roughnessMap={low ? undefined : suite?.graphiteRough}
      metalnessMap={low ? undefined : suite?.graphiteMetal}
      normalMap={low ? undefined : suite?.graphiteNormal}
      metalness={low ? Math.min(0.55, metalness) : Math.max(0.82, metalness)}
      roughness={Math.min(roughness, 0.32)}
      envMapIntensity={2.25}
      normalScale={new THREE.Vector2(0.7, 0.7)}
    />
  );
}

/** Brushed silver trim. */
export function Brushed({ roughness = 0.22 }: { roughness?: number }) {
  const suite = usePbrSuite();
  return (
    <meshStandardMaterial
      color="#9AA3AE"
      roughnessMap={suite?.brushRough}
      normalMap={suite?.brushNormal}
      metalness={0.96}
      roughness={Math.min(roughness, 0.2)}
      envMapIntensity={2.35}
      normalScale={new THREE.Vector2(0.85, 0.85)}
    />
  );
}

/** Darker anodized metal. */
export function Anodized({ roughness = 0.18 }: { roughness?: number }) {
  const suite = usePbrSuite();
  return (
    <meshStandardMaterial
      color="#161A20"
      map={suite?.graphiteAlbedo}
      roughnessMap={suite?.brushRough}
      normalMap={suite?.brushNormal}
      metalness={0.96}
      roughness={roughness}
      envMapIntensity={1.7}
      normalScale={new THREE.Vector2(0.28, 0.28)}
    />
  );
}

/** Plaza / hall floor plate with larger grain. */
export function FloorMetal({ roughness = 0.46 }: { roughness?: number }) {
  const suite = usePbrSuite();
  return (
    <meshStandardMaterial
      color="#2A313A"
      map={suite?.graphiteAlbedo}
      roughnessMap={suite?.floorRough}
      normalMap={suite?.graphiteNormal}
      metalness={0.58}
      roughness={roughness}
      envMapIntensity={1.7}
      normalScale={new THREE.Vector2(0.3, 0.3)}
    />
  );
}

/** Architectural glass — reads on MEDIUM without relying on HIGH transmission. */
export function GlassPanel({
  accent = '#8A909A',
  opacity = 0.28,
}: {
  accent?: string;
  opacity?: number;
}) {
  const level = useCommandStore((s) => s.quality.level);
  if (level === 'low') {
    return (
      <meshStandardMaterial
        color="#1C222C"
        metalness={0.72}
        roughness={0.12}
        transparent
        opacity={0.78}
        envMapIntensity={1.1}
      />
    );
  }
  return (
    <meshPhysicalMaterial
      color="#1A2028"
      metalness={0.08}
      roughness={0.045}
      transmission={level === 'high' ? 0.46 : 0.26}
      thickness={0.4}
      ior={1.48}
      transparent
      opacity={opacity}
      envMapIntensity={2.1}
      clearcoat={1}
      clearcoatRoughness={0.06}
      attenuationColor={accent}
      attenuationDistance={2.2}
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

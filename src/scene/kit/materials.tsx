'use client';

import * as THREE from 'three';
import { usePbrSuite } from '@/scene/kit/pbrMaps';
import { useCommandStore } from '@/store/useCommandStore';

const NORMAL = new THREE.Vector2(0.55, 0.55);

/** Graphite chassis — physical metal + clearcoat so MEDIUM still specs. */
export function Graphite({ roughness = 0.22, metalness = 0.94 }: { roughness?: number; metalness?: number }) {
  const low = useCommandStore((s) => s.quality.level === 'low');
  const suite = usePbrSuite();
  if (low) {
    return (
      <meshStandardMaterial
        color="#6A727C"
        metalness={0.82}
        roughness={0.28}
        envMapIntensity={1.8}
      />
    );
  }
  return (
    <meshPhysicalMaterial
      color="#5C646E"
      roughnessMap={suite?.graphiteRough}
      normalMap={suite?.graphiteNormal}
      metalness={metalness}
      roughness={roughness}
      envMapIntensity={2.55}
      clearcoat={0.4}
      clearcoatRoughness={0.28}
      normalScale={NORMAL}
    />
  );
}

/** Brushed silver trim — hard specular on MEDIUM. */
export function Brushed({ roughness = 0.12 }: { roughness?: number }) {
  const low = useCommandStore((s) => s.quality.level === 'low');
  const suite = usePbrSuite();
  if (low) {
    return <meshStandardMaterial color="#C5CCD4" metalness={0.92} roughness={0.18} envMapIntensity={1.9} />;
  }
  return (
    <meshPhysicalMaterial
      color="#D0D6DE"
      roughnessMap={suite?.brushRough}
      normalMap={suite?.brushNormal}
      metalness={1}
      roughness={roughness}
      envMapIntensity={3.1}
      clearcoat={0.72}
      clearcoatRoughness={0.12}
      normalScale={new THREE.Vector2(0.7, 0.7)}
    />
  );
}

/** Darker anodized metal — still reflective, not a crushed void. */
export function Anodized({ roughness = 0.2 }: { roughness?: number }) {
  const low = useCommandStore((s) => s.quality.level === 'low');
  const suite = usePbrSuite();
  if (low) {
    return <meshStandardMaterial color="#2A3038" metalness={0.88} roughness={0.26} envMapIntensity={1.6} />;
  }
  return (
    <meshPhysicalMaterial
      color="#343B44"
      roughnessMap={suite?.brushRough}
      normalMap={suite?.brushNormal}
      metalness={0.96}
      roughness={roughness}
      envMapIntensity={2.55}
      clearcoat={0.35}
      clearcoatRoughness={0.28}
      normalScale={new THREE.Vector2(0.4, 0.4)}
    />
  );
}

/** Plaza / hall floor — glossy graphite plate. */
export function FloorMetal({ roughness = 0.28 }: { roughness?: number }) {
  const suite = usePbrSuite();
  return (
    <meshPhysicalMaterial
      color="#323940"
      roughnessMap={suite?.floorRough}
      normalMap={suite?.graphiteNormal}
      metalness={0.7}
      roughness={roughness}
      envMapIntensity={1.85}
      clearcoat={0.08}
      clearcoatRoughness={0.5}
      normalScale={new THREE.Vector2(0.35, 0.35)}
    />
  );
}

/** Architectural glass — clearcoat + env so MEDIUM reads as glass. */
export function GlassPanel({
  accent = '#8A909A',
  opacity = 0.32,
}: {
  accent?: string;
  opacity?: number;
}) {
  const level = useCommandStore((s) => s.quality.level);
  if (level === 'low') {
    return (
      <meshStandardMaterial
        color="#2A333E"
        metalness={0.78}
        roughness={0.08}
        transparent
        opacity={0.74}
        envMapIntensity={1.6}
      />
    );
  }
  return (
    <meshPhysicalMaterial
      color="#24303C"
      metalness={0.18}
      roughness={0.03}
      transmission={level === 'high' ? 0.5 : 0.34}
      thickness={0.45}
      ior={1.5}
      transparent
      opacity={opacity}
      envMapIntensity={3.2}
      clearcoat={1}
      clearcoatRoughness={0.04}
      attenuationColor={accent}
      attenuationDistance={2}
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

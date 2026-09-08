'use client';

import { Anodized, Brushed, GlassPanel, Graphite, LitSlit } from '@/scene/kit/materials';

export function Column({
  height = 3.2,
  width = 0.28,
  capital = true,
}: {
  height?: number;
  width?: number;
  capital?: boolean;
}) {
  const shaft = height - (capital ? 0.28 : 0.08);
  return (
    <group>
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[width * 1.35, 0.12, width * 1.35]} />
        <Brushed roughness={0.34} />
      </mesh>
      <mesh position={[0, 0.12 + shaft / 2, 0]}>
        <boxGeometry args={[width, shaft, width]} />
        <Graphite roughness={0.46} />
      </mesh>
      {capital ? (
        <mesh position={[0, height - 0.08, 0]}>
          <boxGeometry args={[width * 1.4, 0.1, width * 1.4]} />
          <Brushed roughness={0.3} />
        </mesh>
      ) : null}
    </group>
  );
}

export function Beam({
  length,
  thick = 0.14,
  depth = 0.22,
}: {
  length: number;
  thick?: number;
  depth?: number;
}) {
  return (
    <mesh>
      <boxGeometry args={[length, thick, depth]} />
      <Graphite roughness={0.4} />
    </mesh>
  );
}

export function FramedPanel({
  width,
  height,
  accent,
  thickness = 0.04,
}: {
  width: number;
  height: number;
  accent?: string;
  thickness?: number;
}) {
  const frame = 0.045;
  return (
    <group>
      <mesh>
        <boxGeometry args={[width - frame * 2, height - frame * 2, thickness]} />
        <GlassPanel accent={accent} />
      </mesh>
      <mesh position={[0, height / 2 - frame / 2, 0]}>
        <boxGeometry args={[width, frame, thickness * 1.4]} />
        <Brushed roughness={0.32} />
      </mesh>
      <mesh position={[0, -height / 2 + frame / 2, 0]}>
        <boxGeometry args={[width, frame, thickness * 1.4]} />
        <Brushed roughness={0.32} />
      </mesh>
      <mesh position={[width / 2 - frame / 2, 0, 0]}>
        <boxGeometry args={[frame, height, thickness * 1.4]} />
        <Brushed roughness={0.32} />
      </mesh>
      <mesh position={[-width / 2 + frame / 2, 0, 0]}>
        <boxGeometry args={[frame, height, thickness * 1.4]} />
        <Brushed roughness={0.32} />
      </mesh>
    </group>
  );
}

export function Plinth({
  size = [1.6, 0.22, 1.6],
  steps = 2,
}: {
  size?: [number, number, number];
  steps?: number;
}) {
  const [sx, sy, sz] = size;
  return (
    <group>
      {Array.from({ length: steps }, (_, i) => {
        const t = 1 + i * 0.16;
        return (
          <mesh key={i} position={[0, -sy / 2 - i * sy * 0.55, 0]}>
            <boxGeometry args={[sx * t, sy * 0.7, sz * t]} />
            <Graphite roughness={0.5} />
          </mesh>
        );
      })}
      <mesh>
        <boxGeometry args={size} />
        <Graphite roughness={0.38} />
      </mesh>
      <mesh position={[0, sy / 2 + 0.008, 0]}>
        <boxGeometry args={[sx * 0.92, 0.012, sz * 0.92]} />
        <Brushed roughness={0.24} />
      </mesh>
    </group>
  );
}

export function Slit({
  position,
  size,
  accent,
  intensity = 0.75,
}: {
  position: [number, number, number];
  size: [number, number, number];
  accent?: string;
  intensity?: number;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <LitSlit accent={accent} intensity={intensity} />
    </mesh>
  );
}

export function Cable({
  a,
  b,
  radius = 0.018,
}: {
  a: [number, number, number];
  b: [number, number, number];
  radius?: number;
}) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const len = Math.max(0.01, Math.hypot(dx, dy, dz));
  const mid: [number, number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const yaw = Math.atan2(dx, dz);
  const pitch = Math.atan2(dy, Math.hypot(dx, dz)) - Math.PI / 2;
  return (
    <mesh position={mid} rotation={[pitch, yaw, 0]}>
      <cylinderGeometry args={[radius, radius, len, 6]} />
      <Anodized roughness={0.4} />
    </mesh>
  );
}

export function FloorPlate({
  size,
  inset = true,
}: {
  size: [number, number];
  inset?: boolean;
}) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={size} />
        <Graphite roughness={0.58} metalness={0.38} />
      </mesh>
      {inset ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
          <planeGeometry args={[size[0] * 0.18, size[1] * 0.04]} />
          <Brushed roughness={0.36} />
        </mesh>
      ) : null}
    </group>
  );
}

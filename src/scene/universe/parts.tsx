'use client';

import { useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AccentGlow } from '@/scene/materials/AccentGlow';
import { ChassisMaterial } from '@/scene/materials/ChassisMaterial';
import { SilverMaterial } from '@/scene/materials/SilverMaterial';

export function Spin({ children, speed = 0.028 }: { children: ReactNode; speed?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * speed;
  });
  return <group ref={ref}>{children}</group>;
}

export function Nucleus({ radius = 0.18, accent }: { radius?: number; accent: string }) {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[radius, 20, 16]} />
        <ChassisMaterial roughness={0.22} />
      </mesh>
      <mesh>
        <sphereGeometry args={[radius * 0.38, 12, 10]} />
        <AccentGlow accent={accent} opacity={0.92} />
      </mesh>
    </group>
  );
}

export function Strut({
  a,
  b,
  radius = 0.016,
  segs = 8,
  silver = true,
}: {
  a: [number, number, number];
  b: [number, number, number];
  radius?: number;
  segs?: number;
  silver?: boolean;
}) {
  const { pos, quat, len } = useMemo(() => {
    const start = new THREE.Vector3(...a);
    const end = new THREE.Vector3(...b);
    const dir = end.clone().sub(start);
    const length = Math.max(0.01, dir.length());
    const mid = start.clone().add(end).multiplyScalar(0.5);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return { pos: mid, quat: quaternion, len: length };
  }, [a, b]);
  return (
    <mesh position={pos} quaternion={quat}>
      <cylinderGeometry args={[radius, radius, len, segs]} />
      {silver ? <SilverMaterial roughness={0.22} /> : <ChassisMaterial />}
    </mesh>
  );
}

const BOX_EDGES: Array<{ p: [number, number, number]; r: [number, number, number]; axis: 'x' | 'y' | 'z' }> = [
  { p: [0, 1, 1], r: [0, 0, Math.PI / 2], axis: 'x' },
  { p: [0, 1, -1], r: [0, 0, Math.PI / 2], axis: 'x' },
  { p: [0, -1, 1], r: [0, 0, Math.PI / 2], axis: 'x' },
  { p: [0, -1, -1], r: [0, 0, Math.PI / 2], axis: 'x' },
  { p: [1, 0, 1], r: [0, 0, 0], axis: 'y' },
  { p: [1, 0, -1], r: [0, 0, 0], axis: 'y' },
  { p: [-1, 0, 1], r: [0, 0, 0], axis: 'y' },
  { p: [-1, 0, -1], r: [0, 0, 0], axis: 'y' },
  { p: [1, 1, 0], r: [Math.PI / 2, 0, 0], axis: 'z' },
  { p: [1, -1, 0], r: [Math.PI / 2, 0, 0], axis: 'z' },
  { p: [-1, 1, 0], r: [Math.PI / 2, 0, 0], axis: 'z' },
  { p: [-1, -1, 0], r: [Math.PI / 2, 0, 0], axis: 'z' },
];

export function BoxFrame({
  size,
  radius = 0.018,
  segs = 8,
}: {
  size: [number, number, number];
  radius?: number;
  segs?: number;
}) {
  const [sx, sy, sz] = size;
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;
  return (
    <group>
      {BOX_EDGES.map((edge, i) => {
        const len = edge.axis === 'x' ? sx : edge.axis === 'y' ? sy : sz;
        return (
          <mesh key={i} position={[edge.p[0] * hx, edge.p[1] * hy, edge.p[2] * hz]} rotation={edge.r}>
            <cylinderGeometry args={[radius, radius, len, segs]} />
            <SilverMaterial roughness={0.2} />
          </mesh>
        );
      })}
    </group>
  );
}

export function FacePlates({ size, thickness = 0.05 }: { size: [number, number, number]; thickness?: number }) {
  const [sx, sy, sz] = size;
  const gap = 0.1;
  const px = sx - gap;
  const py = sy - gap;
  const pz = sz - gap;
  const hx = sx / 2 - thickness / 2;
  const hy = sy / 2 - thickness / 2;
  const hz = sz / 2 - thickness / 2;
  return (
    <group>
      <mesh position={[0, hy, 0]}>
        <boxGeometry args={[px, thickness, pz]} />
        <ChassisMaterial />
      </mesh>
      <mesh position={[0, -hy, 0]}>
        <boxGeometry args={[px, thickness, pz]} />
        <ChassisMaterial />
      </mesh>
      <mesh position={[hx, 0, 0]}>
        <boxGeometry args={[thickness, py, pz]} />
        <ChassisMaterial />
      </mesh>
      <mesh position={[-hx, 0, 0]}>
        <boxGeometry args={[thickness, py, pz]} />
        <ChassisMaterial />
      </mesh>
      <mesh position={[0, 0, hz]}>
        <boxGeometry args={[px, py, thickness]} />
        <ChassisMaterial />
      </mesh>
      <mesh position={[0, 0, -hz]}>
        <boxGeometry args={[px, py, thickness]} />
        <ChassisMaterial />
      </mesh>
    </group>
  );
}

export function AccentSlit({
  position,
  size,
  accent,
}: {
  position: [number, number, number];
  size: [number, number, number];
  accent: string;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <AccentGlow accent={accent} opacity={0.9} />
    </mesh>
  );
}

export function SilverRing({
  radius,
  tube = 0.012,
  rotation = [1.22, 0.15, 0.08],
  segs = 64,
}: {
  radius: number;
  tube?: number;
  rotation?: [number, number, number];
  segs?: number;
}) {
  return (
    <mesh rotation={rotation}>
      <torusGeometry args={[radius, tube, 8, segs]} />
      <SilverMaterial roughness={0.18} />
    </mesh>
  );
}

export function Deck({ radius = 0.58 }: { radius?: number }) {
  return (
    <group position={[0, -0.42, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius, radius, 0.045, 28]} />
        <ChassisMaterial roughness={0.34} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <torusGeometry args={[radius, 0.012, 8, 32]} />
        <SilverMaterial roughness={0.22} />
      </mesh>
    </group>
  );
}

'use client';

import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SilhouetteKind } from '@/scene/universe/identities';

interface Props {
  kind: SilhouetteKind;
  accent: string;
  segs: number;
}

function mat(accent: string, opacity = 0.62) {
  return (
    <meshStandardMaterial
      color={accent}
      metalness={0.46}
      roughness={0.32}
      transparent
      opacity={opacity}
      emissive={accent}
      emissiveIntensity={0.1}
    />
  );
}

function Spin({ children, speed = 0.12 }: { children: ReactNode; speed?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * speed;
  });
  return <group ref={ref}>{children}</group>;
}

export function EntitySilhouette({ kind, accent, segs }: Props) {
  const wire = <meshBasicMaterial color={accent} wireframe transparent opacity={0.28} />;

  if (kind === 'lattice') {
    return (
      <Spin speed={0.07}>
        <mesh>
          <boxGeometry args={[1.55, 1.55, 1.55]} />
          {wire}
        </mesh>
        <mesh>
          <octahedronGeometry args={[0.58, 0]} />
          {mat(accent, 0.78)}
        </mesh>
        {[-0.52, 0.52].map((x) =>
          [-0.52, 0.52].map((z) => (
            <mesh key={`${x}${z}`} position={[x, 0, z]}>
              <boxGeometry args={[0.18, 0.18, 0.18]} />
              {mat('#E6E8EC', 0.55)}
            </mesh>
          )),
        )}
      </Spin>
    );
  }

  if (kind === 'crystal') {
    return (
      <Spin speed={0.1}>
        <mesh rotation={[0.45, 0.25, 0.12]}>
          <octahedronGeometry args={[1.05, 0]} />
          {mat(accent, 0.7)}
        </mesh>
        <mesh rotation={[0.2, 0.9, 0.4]}>
          <tetrahedronGeometry args={[0.55, 0]} />
          {wire}
        </mesh>
      </Spin>
    );
  }

  if (kind === 'rings') {
    return (
      <Spin speed={0.15}>
        {[-0.42, 0, 0.42].map((y, i) => (
          <mesh key={y} rotation={[1.15 + i * 0.18, 0, i * 0.22]} position={[0, y, 0]}>
            <torusGeometry args={[0.82 - i * 0.08, 0.05, 8, Math.max(18, segs)]} />
            {mat(accent, 0.58)}
          </mesh>
        ))}
      </Spin>
    );
  }

  if (kind === 'octa') {
    return (
      <Spin speed={0.08}>
        <mesh>
          <octahedronGeometry args={[1.12, 0]} />
          {mat(accent, 0.58)}
        </mesh>
        <mesh scale={1.22}>
          <octahedronGeometry args={[1.12, 0]} />
          {wire}
        </mesh>
      </Spin>
    );
  }

  if (kind === 'monolith') {
    return (
      <Spin speed={0.045}>
        <mesh>
          <boxGeometry args={[0.72, 1.7, 0.48]} />
          {mat(accent, 0.68)}
        </mesh>
        <mesh position={[0, 1.08, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.42, 8]} />
          {mat('#E6E8EC', 0.5)}
        </mesh>
      </Spin>
    );
  }

  if (kind === 'constellation') {
    const spots: [number, number, number][] = [
      [0.62, 0.18, 0.14],
      [-0.55, 0.32, -0.26],
      [0.12, -0.5, 0.46],
      [-0.18, 0.58, 0.4],
      [0.32, -0.26, -0.58],
    ];
    return (
      <Spin speed={0.1}>
        {spots.map((p) => (
          <mesh key={p.join()} position={p}>
            <sphereGeometry args={[0.16, segs, segs]} />
            {mat(accent, 0.78)}
          </mesh>
        ))}
      </Spin>
    );
  }

  if (kind === 'icosa') {
    return (
      <Spin speed={0.13}>
        <mesh>
          <icosahedronGeometry args={[1.02, 0]} />
          {mat(accent, 0.62)}
        </mesh>
        <mesh>
          <icosahedronGeometry args={[1.28, 0]} />
          {wire}
        </mesh>
      </Spin>
    );
  }

  if (kind === 'folios') {
    return (
      <Spin speed={0.06}>
        {[-0.28, 0, 0.28].map((x, i) => (
          <mesh key={x} position={[x, 0, 0]} rotation={[0.18, i * 0.28, 0.1]}>
            <boxGeometry args={[0.03, 1.35, 0.95]} />
            {mat(accent, 0.58)}
          </mesh>
        ))}
      </Spin>
    );
  }

  if (kind === 'reel') {
    return (
      <Spin speed={0.12}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.88, 0.88, 0.36, segs]} />
          {mat(accent, 0.58)}
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.02, 0.04, 8, segs]} />
          {mat('#E6E8EC', 0.4)}
        </mesh>
      </Spin>
    );
  }

  if (kind === 'vessel') {
    return (
      <Spin speed={0.055}>
        <mesh>
          <sphereGeometry args={[0.58, segs, segs]} />
          {mat(accent, 0.68)}
        </mesh>
        <mesh position={[0, 0.16, 0]} rotation={[1.2, 0, 0]}>
          <torusGeometry args={[0.78, 0.055, 8, segs]} />
          {mat(accent, 0.45)}
        </mesh>
      </Spin>
    );
  }

  return (
    <Spin speed={0.06}>
      <mesh>
        <dodecahedronGeometry args={[0.82, 0]} />
        {mat(accent, 0.52)}
      </mesh>
    </Spin>
  );
}

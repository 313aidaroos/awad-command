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

function mat(accent: string, opacity = 0.55) {
  return (
    <meshStandardMaterial
      color={accent}
      metalness={0.38}
      roughness={0.42}
      transparent
      opacity={opacity}
      emissive={accent}
      emissiveIntensity={0.12}
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
  const wire = (
    <meshBasicMaterial color={accent} wireframe transparent opacity={0.22} />
  );

  if (kind === 'lattice') {
    return (
      <Spin speed={0.08}>
        <mesh>
          <boxGeometry args={[1.15, 1.15, 1.15]} />
          {wire}
        </mesh>
        <mesh>
          <octahedronGeometry args={[0.42, 0]} />
          {mat(accent, 0.7)}
        </mesh>
        {[-0.38, 0.38].map((x) =>
          [-0.38, 0.38].map((z) => (
            <mesh key={`${x}${z}`} position={[x, 0, z]}>
              <sphereGeometry args={[0.09, segs, segs]} />
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
        <mesh rotation={[0.4, 0.2, 0.1]}>
          <octahedronGeometry args={[0.72, 0]} />
          {mat(accent, 0.62)}
        </mesh>
        <mesh rotation={[0.2, 0.8, 0.4]}>
          <tetrahedronGeometry args={[0.38, 0]} />
          {wire}
        </mesh>
      </Spin>
    );
  }

  if (kind === 'rings') {
    return (
      <Spin speed={0.16}>
        {[-0.28, 0, 0.28].map((y, i) => (
          <mesh key={y} rotation={[1.2 + i * 0.15, 0, i * 0.2]} position={[0, y, 0]}>
            <torusGeometry args={[0.55 - i * 0.06, 0.035, 8, Math.max(16, segs)]} />
            {mat(accent, 0.5)}
          </mesh>
        ))}
      </Spin>
    );
  }

  if (kind === 'octa') {
    return (
      <Spin speed={0.09}>
        <mesh>
          <octahedronGeometry args={[0.78, 0]} />
          {mat(accent, 0.5)}
        </mesh>
        <mesh scale={1.18}>
          <octahedronGeometry args={[0.78, 0]} />
          {wire}
        </mesh>
      </Spin>
    );
  }

  if (kind === 'monolith') {
    return (
      <Spin speed={0.05}>
        <mesh>
          <boxGeometry args={[0.55, 1.15, 0.4]} />
          {mat(accent, 0.58)}
        </mesh>
        <mesh position={[0, 0.78, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.35, 8]} />
          {mat('#E6E8EC', 0.45)}
        </mesh>
      </Spin>
    );
  }

  if (kind === 'constellation') {
    const spots: [number, number, number][] = [
      [0.42, 0.12, 0.1],
      [-0.38, 0.22, -0.18],
      [0.08, -0.36, 0.32],
      [-0.12, 0.4, 0.28],
      [0.22, -0.18, -0.4],
    ];
    return (
      <Spin speed={0.11}>
        {spots.map((p) => (
          <mesh key={p.join()} position={p}>
            <sphereGeometry args={[0.11, segs, segs]} />
            {mat(accent, 0.7)}
          </mesh>
        ))}
      </Spin>
    );
  }

  if (kind === 'icosa') {
    return (
      <Spin speed={0.14}>
        <mesh>
          <icosahedronGeometry args={[0.7, 0]} />
          {mat(accent, 0.55)}
        </mesh>
        <mesh>
          <icosahedronGeometry args={[0.88, 0]} />
          {wire}
        </mesh>
      </Spin>
    );
  }

  if (kind === 'folios') {
    return (
      <Spin speed={0.07}>
        {[-0.18, 0, 0.18].map((x, i) => (
          <mesh key={x} position={[x, 0, 0]} rotation={[0.15, i * 0.25, 0.08]}>
            <boxGeometry args={[0.02, 0.95, 0.68]} />
            {mat(accent, 0.5)}
          </mesh>
        ))}
      </Spin>
    );
  }

  if (kind === 'reel') {
    return (
      <Spin speed={0.13}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.62, 0.62, 0.28, segs]} />
          {mat(accent, 0.5)}
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.72, 0.03, 8, segs]} />
          {mat('#E6E8EC', 0.35)}
        </mesh>
      </Spin>
    );
  }

  if (kind === 'vessel') {
    return (
      <Spin speed={0.06}>
        <mesh>
          <sphereGeometry args={[0.42, segs, segs]} />
          {mat(accent, 0.6)}
        </mesh>
        <mesh position={[0, 0.12, 0]} rotation={[1.2, 0, 0]}>
          <torusGeometry args={[0.52, 0.045, 8, segs]} />
          {mat(accent, 0.4)}
        </mesh>
      </Spin>
    );
  }

  return (
    <Spin speed={0.07}>
      <mesh>
        <sphereGeometry args={[0.55, segs, segs]} />
        {mat(accent, 0.45)}
      </mesh>
    </Spin>
  );
}

'use client';

import { useMemo, useRef, type ReactNode } from 'react';
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

function Strut({
  a,
  b,
  accent,
  radius = 0.028,
}: {
  a: [number, number, number];
  b: [number, number, number];
  accent: string;
  radius?: number;
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
      <cylinderGeometry args={[radius, radius, len, 6]} />
      {mat(accent, 0.5)}
    </mesh>
  );
}

const GRAPH: [number, number, number][] = [
  [0.72, 0.22, 0.16],
  [-0.64, 0.38, -0.28],
  [0.14, -0.58, 0.52],
  [-0.22, 0.68, 0.42],
  [0.38, -0.3, -0.64],
  [-0.08, 0.05, 0.02],
];

export function EntitySilhouette({ kind, accent, segs }: Props) {
  const wire = <meshBasicMaterial color={accent} wireframe transparent opacity={0.22} />;
  const hex = Math.max(5, Math.min(10, Math.round(segs / 4)));

  if (kind === 'lattice') {
    return (
      <Spin speed={0.07}>
        <mesh>
          <boxGeometry args={[1.62, 1.62, 1.62]} />
          {wire}
        </mesh>
        <mesh>
          <octahedronGeometry args={[0.42, 0]} />
          {mat(accent, 0.82)}
        </mesh>
        {[-0.54, 0.54].map((x) =>
          [-0.54, 0.54].map((z) => (
            <mesh key={`${x}:${z}`} position={[x, 0, z]}>
              <boxGeometry args={[0.2, 0.2, 0.2]} />
              {mat('#E6E8EC', 0.55)}
            </mesh>
          )),
        )}
        <Strut a={[-0.54, 0, -0.54]} b={[0.54, 0, 0.54]} accent={accent} radius={0.02} />
        <Strut a={[-0.54, 0, 0.54]} b={[0.54, 0, -0.54]} accent={accent} radius={0.02} />
      </Spin>
    );
  }

  if (kind === 'crystal') {
    const towers: Array<{ p: [number, number, number]; h: number; r: number }> = [
      { p: [0, 0, 0], h: 1.55, r: 0.28 },
      { p: [0.48, -0.12, 0.18], h: 1.05, r: 0.18 },
      { p: [-0.42, -0.18, 0.28], h: 0.88, r: 0.16 },
      { p: [0.22, -0.22, -0.46], h: 0.72, r: 0.14 },
      { p: [-0.32, -0.28, -0.32], h: 0.58, r: 0.12 },
    ];
    return (
      <Spin speed={0.08}>
        {towers.map((tower) => (
          <mesh key={`${tower.p.join()}-${tower.h}`} position={[tower.p[0], tower.p[1] + tower.h / 2 - 0.45, tower.p[2]]}>
            <cylinderGeometry args={[tower.r * 0.72, tower.r, tower.h, 6]} />
            {mat(accent, 0.78)}
          </mesh>
        ))}
        <mesh position={[0, 0.62, 0]} rotation={[0.4, 0.2, 0.1]}>
          <octahedronGeometry args={[0.22, 0]} />
          {mat('#E6E8EC', 0.7)}
        </mesh>
      </Spin>
    );
  }

  if (kind === 'rings') {
    return (
      <Spin speed={0.16}>
        {[-0.55, -0.28, 0, 0.28, 0.55].map((y, i) => (
          <mesh key={y} rotation={[1.22, 0, i * 0.08]} position={[0, y, 0]}>
            <cylinderGeometry args={[0.92 - Math.abs(y) * 0.22, 0.92 - Math.abs(y) * 0.22, 0.07, Math.max(18, segs)]} />
            {mat(i === 2 ? '#E6E8EC' : accent, 0.5 + (i === 2 ? 0.18 : 0))}
          </mesh>
        ))}
      </Spin>
    );
  }

  if (kind === 'octa') {
    return (
      <Spin speed={0.07}>
        <mesh scale={[0.48, 1.72, 0.48]}>
          <octahedronGeometry args={[1, 0]} />
          {mat(accent, 0.72)}
        </mesh>
        <mesh scale={[0.62, 1.95, 0.62]}>
          <octahedronGeometry args={[1, 0]} />
          {wire}
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <octahedronGeometry args={[0.28, 0]} />
          {mat('#E6E8EC', 0.7)}
        </mesh>
      </Spin>
    );
  }

  if (kind === 'monolith') {
    const slabs = [
      { y: -0.62, s: [1.05, 0.16, 0.72] as [number, number, number] },
      { y: -0.28, s: [0.88, 0.18, 0.58] as [number, number, number] },
      { y: 0.08, s: [0.7, 0.2, 0.48] as [number, number, number] },
      { y: 0.46, s: [0.52, 0.22, 0.38] as [number, number, number] },
      { y: 0.82, s: [0.32, 0.16, 0.28] as [number, number, number] },
    ];
    return (
      <Spin speed={0.04}>
        {slabs.map((slab) => (
          <mesh key={slab.y} position={[0, slab.y, 0]}>
            <boxGeometry args={slab.s} />
            {mat(accent, 0.72)}
          </mesh>
        ))}
      </Spin>
    );
  }

  if (kind === 'constellation') {
    const links: Array<[number, number]> = [
      [0, 5],
      [1, 5],
      [2, 5],
      [3, 5],
      [4, 5],
      [0, 3],
      [1, 4],
      [2, 0],
    ];
    return (
      <Spin speed={0.09}>
        {GRAPH.map((p, i) => (
          <mesh key={p.join()} position={p}>
            <sphereGeometry args={[i === 5 ? 0.18 : 0.13, hex, hex]} />
            {mat(i === 5 ? '#E6E8EC' : accent, 0.82)}
          </mesh>
        ))}
        {links.map(([ia, ib]) => {
          const a = GRAPH[ia];
          const b = GRAPH[ib];
          if (!a || !b) return null;
          return <Strut key={`${ia}-${ib}`} a={a} b={b} accent={accent} radius={0.018} />;
        })}
      </Spin>
    );
  }

  if (kind === 'icosa') {
    return (
      <Spin speed={0.14}>
        <mesh>
          <boxGeometry args={[0.52, 0.52, 0.52]} />
          {mat('#E6E8EC', 0.7)}
        </mesh>
        <mesh>
          <icosahedronGeometry args={[1.05, 0]} />
          {wire}
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.72, 0.045, 8, Math.max(16, segs)]} />
          {mat(accent, 0.62)}
        </mesh>
        <mesh position={[0, 0.82, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.55, 8]} />
          {mat(accent, 0.7)}
        </mesh>
        <mesh position={[0, 1.12, 0]} rotation={[1.2, 0, 0]}>
          <torusGeometry args={[0.16, 0.03, 6, 16]} />
          {mat(accent, 0.55)}
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[Math.cos((i * Math.PI) / 2) * 0.58, 0, Math.sin((i * Math.PI) / 2) * 0.58]}>
            <boxGeometry args={[0.12, 0.12, 0.12]} />
            {mat(accent, 0.78)}
          </mesh>
        ))}
      </Spin>
    );
  }

  if (kind === 'folios') {
    return (
      <Spin speed={0.055}>
        {[-0.42, -0.21, 0, 0.21, 0.42].map((x, i) => (
          <mesh key={x} position={[x * 0.55, 0, 0]} rotation={[0.12, i * 0.16 - 0.32, 0.08]}>
            <boxGeometry args={[0.035, 1.42, 1.02]} />
            {mat(i === 2 ? '#E6E8EC' : accent, 0.62)}
          </mesh>
        ))}
      </Spin>
    );
  }

  if (kind === 'reel') {
    return (
      <Spin speed={0.11}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.92, 0.92, 0.22, Math.max(16, segs)]} />
          {mat(accent, 0.58)}
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} rotation={[0, (i * Math.PI) / 3, 0]}>
            <boxGeometry args={[0.08, 0.08, 1.55]} />
            {mat('#E6E8EC', 0.45)}
          </mesh>
        ))}
        <mesh position={[0, -0.02, 0.72]} rotation={[0.15, 0.4, 0.1]}>
          <boxGeometry args={[0.04, 0.55, 0.9]} />
          {mat(accent, 0.5)}
        </mesh>
      </Spin>
    );
  }

  if (kind === 'vessel') {
    return (
      <Spin speed={0.05}>
        <mesh rotation={[Math.PI, 0, 0]} position={[0, -0.12, 0]}>
          <cylinderGeometry args={[0.72, 0.28, 0.62, Math.max(16, segs), 1, true]} />
          {mat(accent, 0.7)}
        </mesh>
        <mesh position={[0, 0.18, 0]} rotation={[1.57, 0, 0]}>
          <torusGeometry args={[0.72, 0.05, 8, Math.max(16, segs)]} />
          {mat('#E6E8EC', 0.55)}
        </mesh>
        <mesh position={[0, -0.08, 0]}>
          <sphereGeometry args={[0.38, hex, hex]} />
          {mat(accent, 0.45)}
        </mesh>
      </Spin>
    );
  }

  return (
    <Spin speed={0.05}>
      <mesh>
        <sphereGeometry args={[0.62, hex, hex]} />
        {mat(accent, 0.55)}
      </mesh>
      <mesh position={[0.42, 0.18, 0.12]}>
        <sphereGeometry args={[0.32, hex, hex]} />
        {mat(accent, 0.48)}
      </mesh>
      <mesh position={[-0.34, -0.12, 0.22]}>
        <sphereGeometry args={[0.28, hex, hex]} />
        {mat('#E6E8EC', 0.4)}
      </mesh>
    </Spin>
  );
}

'use client';

import { useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GlassMaterial } from '@/scene/materials/GlassMaterial';
import type { SilhouetteKind } from '@/scene/universe/identities';

interface Props {
  kind: SilhouetteKind;
  accent: string;
  segs: number;
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
  radius = 0.024,
  segs,
}: {
  a: [number, number, number];
  b: [number, number, number];
  accent: string;
  radius?: number;
  segs: number;
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
      <cylinderGeometry args={[radius, radius, len, Math.max(8, Math.round(segs / 4))]} />
      <GlassMaterial accent={accent} opacity={0.52} />
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
  const hex = Math.max(8, Math.min(16, Math.round(segs / 2.4)));
  const radial = Math.max(16, segs);
  const smooth = segs >= 28 ? 1 : 0;

  if (kind === 'lattice') {
    return (
      <Spin speed={0.07}>
        <mesh>
          <boxGeometry args={[1.42, 1.42, 1.42]} />
          <GlassMaterial accent={accent} opacity={0.42} emissive={0.05} />
        </mesh>
        <mesh>
          <octahedronGeometry args={[0.5, 0]} />
          <GlassMaterial accent={accent} opacity={0.88} emissive={0.1} />
        </mesh>
        {[-0.54, 0.54].map((x) =>
          [-0.54, 0.54].map((z) => (
            <mesh key={`${x}:${z}`} position={[x, 0, z]}>
              <boxGeometry args={[0.18, 0.18, 0.18]} />
              <GlassMaterial accent="#E6E8EC" opacity={0.55} />
            </mesh>
          )),
        )}
        <Strut a={[-0.54, 0, -0.54]} b={[0.54, 0, 0.54]} accent={accent} radius={0.018} segs={segs} />
        <Strut a={[-0.54, 0, 0.54]} b={[0.54, 0, -0.54]} accent={accent} radius={0.018} segs={segs} />
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
            <cylinderGeometry args={[tower.r * 0.72, tower.r, tower.h, hex]} />
            <GlassMaterial accent={accent} opacity={0.78} />
          </mesh>
        ))}
        <mesh position={[0, 0.62, 0]} rotation={[0.4, 0.2, 0.1]}>
          <octahedronGeometry args={[0.2, 0]} />
          <GlassMaterial accent="#E6E8EC" opacity={0.7} />
        </mesh>
      </Spin>
    );
  }

  if (kind === 'rings') {
    return (
      <Spin speed={0.16}>
        {[-0.55, -0.28, 0, 0.28, 0.55].map((y, i) => (
          <mesh key={y} rotation={[1.22, 0, i * 0.08]} position={[0, y, 0]}>
            <cylinderGeometry args={[0.92 - Math.abs(y) * 0.22, 0.92 - Math.abs(y) * 0.22, 0.055, radial]} />
            <GlassMaterial accent={i === 2 ? '#E6E8EC' : accent} opacity={0.48 + (i === 2 ? 0.16 : 0)} />
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
          <GlassMaterial accent={accent} opacity={0.7} />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <octahedronGeometry args={[0.26, 0]} />
          <GlassMaterial accent="#E6E8EC" opacity={0.72} />
        </mesh>
      </Spin>
    );
  }

  if (kind === 'monolith') {
    const slabs = [
      { y: -0.62, s: [1.05, 0.14, 0.72] as [number, number, number] },
      { y: -0.28, s: [0.88, 0.16, 0.58] as [number, number, number] },
      { y: 0.08, s: [0.7, 0.18, 0.48] as [number, number, number] },
      { y: 0.46, s: [0.52, 0.2, 0.38] as [number, number, number] },
      { y: 0.82, s: [0.32, 0.14, 0.28] as [number, number, number] },
    ];
    return (
      <Spin speed={0.04}>
        {slabs.map((slab) => (
          <mesh key={slab.y} position={[0, slab.y, 0]}>
            <boxGeometry args={slab.s} />
            <GlassMaterial accent={accent} opacity={0.76} />
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
            <sphereGeometry args={[i === 5 ? 0.17 : 0.12, hex, hex]} />
            <GlassMaterial accent={i === 5 ? '#E6E8EC' : accent} opacity={0.78} />
          </mesh>
        ))}
        {links.map(([ia, ib]) => {
          const a = GRAPH[ia];
          const b = GRAPH[ib];
          if (!a || !b) return null;
          return <Strut key={`${ia}-${ib}`} a={a} b={b} accent={accent} radius={0.016} segs={segs} />;
        })}
      </Spin>
    );
  }

  if (kind === 'icosa') {
    return (
      <Spin speed={0.14}>
        <mesh>
          <boxGeometry args={[0.48, 0.48, 0.48]} />
          <GlassMaterial accent="#E6E8EC" opacity={0.7} />
        </mesh>
        <mesh>
          <icosahedronGeometry args={[0.92, smooth]} />
          <GlassMaterial accent={accent} opacity={0.48} emissive={0.06} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.72, 0.038, 10, radial]} />
          <GlassMaterial accent={accent} opacity={0.62} />
        </mesh>
        <mesh position={[0, 0.82, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.5, 10]} />
          <GlassMaterial accent={accent} opacity={0.7} />
        </mesh>
        <mesh position={[0, 1.12, 0]} rotation={[1.2, 0, 0]}>
          <torusGeometry args={[0.15, 0.026, 8, 20]} />
          <GlassMaterial accent={accent} opacity={0.55} />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[Math.cos((i * Math.PI) / 2) * 0.56, 0, Math.sin((i * Math.PI) / 2) * 0.56]}>
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <GlassMaterial accent={accent} opacity={0.74} />
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
            <boxGeometry args={[0.032, 1.42, 1.02]} />
            <GlassMaterial accent={i === 2 ? '#E6E8EC' : accent} opacity={0.6} />
          </mesh>
        ))}
      </Spin>
    );
  }

  if (kind === 'reel') {
    return (
      <Spin speed={0.11}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.9, 0.9, 0.2, radial]} />
          <GlassMaterial accent={accent} opacity={0.62} />
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} rotation={[0, (i * Math.PI) / 3, 0]}>
            <boxGeometry args={[0.06, 0.06, 1.48]} />
            <GlassMaterial accent="#E6E8EC" opacity={0.42} />
          </mesh>
        ))}
        <mesh position={[0, -0.02, 0.72]} rotation={[0.15, 0.4, 0.1]}>
          <boxGeometry args={[0.035, 0.5, 0.86]} />
          <GlassMaterial accent={accent} opacity={0.5} />
        </mesh>
      </Spin>
    );
  }

  if (kind === 'vessel') {
    return (
      <Spin speed={0.05}>
        <mesh rotation={[Math.PI, 0, 0]} position={[0, -0.12, 0]}>
          <cylinderGeometry args={[0.72, 0.28, 0.62, radial, 1, true]} />
          <GlassMaterial accent={accent} opacity={0.68} />
        </mesh>
        <mesh position={[0, 0.18, 0]} rotation={[1.57, 0, 0]}>
          <torusGeometry args={[0.72, 0.042, 10, radial]} />
          <GlassMaterial accent="#E6E8EC" opacity={0.55} />
        </mesh>
        <mesh position={[0, -0.08, 0]}>
          <sphereGeometry args={[0.36, hex, hex]} />
          <GlassMaterial accent={accent} opacity={0.42} />
        </mesh>
      </Spin>
    );
  }

  return (
    <Spin speed={0.05}>
      <mesh>
        <sphereGeometry args={[0.6, hex, hex]} />
        <GlassMaterial accent={accent} opacity={0.52} />
      </mesh>
      <mesh position={[0.4, 0.16, 0.12]}>
        <sphereGeometry args={[0.3, hex, hex]} />
        <GlassMaterial accent={accent} opacity={0.46} />
      </mesh>
      <mesh position={[-0.32, -0.12, 0.2]}>
        <sphereGeometry args={[0.26, hex, hex]} />
        <GlassMaterial accent="#E6E8EC" opacity={0.4} />
      </mesh>
    </Spin>
  );
}

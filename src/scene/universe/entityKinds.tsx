'use client';

import { AccentGlow } from '@/scene/materials/AccentGlow';
import { ChassisMaterial } from '@/scene/materials/ChassisMaterial';
import { SilverMaterial } from '@/scene/materials/SilverMaterial';
import {
  AccentSlit,
  BoxFrame,
  FacePlates,
  Nucleus,
  SilverRing,
  Spin,
  Strut,
} from '@/scene/universe/parts';

export interface KindProps {
  accent: string;
  segs: number;
  detail: boolean;
}

export function LatticeKind({ accent, segs }: KindProps) {
  const s = 1.62;
  return (
    <Spin speed={0.028}>
      <Nucleus radius={0.22} accent={accent} />
      <mesh>
        <boxGeometry args={[0.92, 0.92, 0.92]} />
        <ChassisMaterial roughness={0.42} />
      </mesh>
      <FacePlates size={[s, s, s]} />
      <BoxFrame size={[s, s, s]} radius={0.028} segs={Math.max(6, Math.round(segs / 6))} />
      {[-1, 1].flatMap((x) =>
        [-1, 1].flatMap((y) =>
          [-1, 1].map((z) => (
            <mesh key={`${x}${y}${z}`} position={[(x * s) / 2, (y * s) / 2, (z * s) / 2]}>
              <boxGeometry args={[0.09, 0.09, 0.09]} />
              <SilverMaterial />
            </mesh>
          )),
        ),
      )}
      <AccentSlit position={[s / 2, 0, 0]} size={[0.03, 0.58, 0.035]} accent={accent} />
      <AccentSlit position={[-s / 2, 0, 0]} size={[0.03, 0.58, 0.035]} accent={accent} />
      <AccentSlit position={[0, 0, s / 2]} size={[0.035, 0.58, 0.03]} accent={accent} />
    </Spin>
  );
}

export function CrystalKind({ accent, segs, detail }: KindProps) {
  const hex = Math.max(6, Math.round(segs / 4));
  const towers: Array<{ p: [number, number, number]; h: number; r: number }> = [
    { p: [0, 0, 0], h: 1.72, r: 0.26 },
    { p: [0.46, 0, 0.2], h: 1.18, r: 0.16 },
    { p: [-0.4, 0, 0.26], h: 0.98, r: 0.14 },
    { p: [0.2, 0, -0.44], h: 0.82, r: 0.12 },
  ];
  return (
    <Spin speed={0.032}>
      <Nucleus radius={0.16} accent={accent} />
      {towers.map((tower) => (
        <group key={`${tower.p.join()}-${tower.h}`} position={[tower.p[0], tower.h / 2 - 0.55, tower.p[2]]}>
          <mesh>
            <cylinderGeometry args={[tower.r * 0.78, tower.r, tower.h, hex]} />
            <ChassisMaterial roughness={0.24} />
          </mesh>
          <mesh position={[0, tower.h / 2, 0]}>
            <cylinderGeometry args={[0.012, 0.012, tower.h, 6]} />
            <AccentGlow accent={accent} opacity={0.8} />
          </mesh>
        </group>
      ))}
      {detail ? <SilverRing radius={0.72} tube={0.01} rotation={[1.15, 0.2, 0.1]} segs={segs} /> : null}
    </Spin>
  );
}

export function RingsKind({ accent, segs }: KindProps) {
  return (
    <Spin speed={0.04}>
      <Nucleus radius={0.16} accent={accent} />
      {[-0.58, -0.29, 0, 0.29, 0.58].map((y, i) => {
        const r = 0.95 - Math.abs(y) * 0.2;
        return (
          <group key={y} position={[0, y, 0]} rotation={[1.2, 0, i * 0.06]}>
            <mesh>
              <cylinderGeometry args={[r, r, 0.07, segs]} />
              <ChassisMaterial roughness={0.3} />
            </mesh>
            <mesh>
              <torusGeometry args={[r, 0.012, 8, segs]} />
              <SilverMaterial />
            </mesh>
            {i === 2 ? (
              <mesh>
                <torusGeometry args={[r * 0.55, 0.018, 8, 24]} />
                <AccentGlow accent={accent} opacity={0.7} />
              </mesh>
            ) : null}
          </group>
        );
      })}
    </Spin>
  );
}

export function OctaKind({ accent, segs, detail }: KindProps) {
  return (
    <Spin speed={0.03}>
      <Nucleus radius={0.14} accent={accent} />
      <mesh scale={[0.42, 1.58, 0.42]}>
        <octahedronGeometry args={[1, 0]} />
        <ChassisMaterial roughness={0.22} />
      </mesh>
      {detail ? (
        <mesh position={[0, 0.1, 0]}>
          <octahedronGeometry args={[0.2, 0]} />
          <AccentGlow accent={accent} opacity={0.85} />
        </mesh>
      ) : null}
      <SilverRing radius={0.48} tube={0.012} rotation={[1.57, 0, 0]} segs={segs} />
    </Spin>
  );
}

export function MonolithKind({ accent, detail }: KindProps) {
  const slabs = [
    { y: -0.68, s: [1.12, 0.16, 0.76] as [number, number, number] },
    { y: -0.32, s: [0.92, 0.18, 0.62] as [number, number, number] },
    { y: 0.06, s: [0.72, 0.2, 0.5] as [number, number, number] },
    { y: 0.44, s: [0.52, 0.2, 0.38] as [number, number, number] },
    { y: 0.78, s: [0.32, 0.14, 0.26] as [number, number, number] },
  ];
  return (
    <Spin speed={0.035}>
      <Nucleus radius={0.12} accent={accent} />
      {slabs.map((slab) => (
        <group key={slab.y} position={[0, slab.y, 0]}>
          <mesh>
            <boxGeometry args={slab.s} />
            <ChassisMaterial roughness={0.3} />
          </mesh>
          <BoxFrame size={slab.s} radius={0.012} segs={6} />
        </group>
      ))}
      {detail ? <AccentSlit position={[0, 0.06, 0.26]} size={[0.22, 0.04, 0.02]} accent={accent} /> : null}
    </Spin>
  );
}

const GRAPH: [number, number, number][] = [
  [0.72, 0.22, 0.16],
  [-0.64, 0.38, -0.28],
  [0.14, -0.58, 0.52],
  [-0.22, 0.68, 0.42],
  [0.38, -0.3, -0.64],
  [0, 0.04, 0.02],
];

export function ConstellationKind({ accent, segs }: KindProps) {
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
    <Spin speed={0.035}>
      {GRAPH.map((p, i) => (
        <mesh key={p.join()} position={p}>
          <sphereGeometry args={[i === 5 ? 0.16 : 0.1, segs / 3, segs / 3]} />
          {i === 5 ? <AccentGlow accent={accent} opacity={0.9} /> : <ChassisMaterial />}
        </mesh>
      ))}
      {links.map(([ia, ib]) => {
        const a = GRAPH[ia];
        const b = GRAPH[ib];
        if (!a || !b) return null;
        return <Strut key={`${ia}-${ib}`} a={a} b={b} radius={0.012} segs={6} />;
      })}
    </Spin>
  );
}

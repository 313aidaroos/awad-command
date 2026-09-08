'use client';

import { AccentGlow } from '@/scene/materials/AccentGlow';
import { ChassisMaterial } from '@/scene/materials/ChassisMaterial';
import { SilverMaterial } from '@/scene/materials/SilverMaterial';
import { AccentSlit, Nucleus, SilverRing, Spin } from '@/scene/universe/parts';
import type { KindProps } from '@/scene/universe/entityKinds';

export function IcosaKind({ accent, segs, detail }: KindProps) {
  return (
    <Spin speed={0.04}>
      <Nucleus radius={0.2} accent={accent} />
      <mesh>
        <boxGeometry args={[0.52, 0.52, 0.52]} />
        <ChassisMaterial roughness={0.22} />
      </mesh>
      <SilverRing radius={0.7} tube={0.014} rotation={[Math.PI / 2, 0, 0]} segs={segs} />
      <mesh position={[0, 0.92, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.42, 8]} />
        <SilverMaterial />
      </mesh>
      {detail ? (
        <mesh position={[0, 1.16, 0]} rotation={[1.2, 0, 0]}>
          <torusGeometry args={[0.12, 0.016, 8, 18]} />
          <AccentGlow accent={accent} opacity={0.75} />
        </mesh>
      ) : null}
    </Spin>
  );
}

export function FoliosKind({ accent }: KindProps) {
  return (
    <Spin speed={0.05}>
      <Nucleus radius={0.14} accent={accent} />
      {[-0.42, -0.21, 0, 0.21, 0.42].map((x, i) => (
        <group key={x} position={[x * 0.52, 0, 0]} rotation={[0.1, i * 0.14 - 0.28, 0.06]}>
          <mesh>
            <boxGeometry args={[0.05, 1.38, 1.02]} />
            <ChassisMaterial roughness={0.32} />
          </mesh>
          <mesh position={[0.028, 0, 0]}>
            <boxGeometry args={[0.01, 1.38, 1.02]} />
            <SilverMaterial roughness={0.2} />
          </mesh>
          {i === 2 ? <AccentSlit position={[0.04, 0.2, 0]} size={[0.012, 0.5, 0.04]} accent={accent} /> : null}
        </group>
      ))}
    </Spin>
  );
}

export function ReelKind({ accent, segs }: KindProps) {
  return (
    <Spin speed={0.035}>
      <Nucleus radius={0.16} accent={accent} />
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.92, 0.92, 0.22, segs]} />
        <ChassisMaterial roughness={0.26} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.92, 0.02, 8, segs]} />
        <SilverMaterial />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} rotation={[0, (i * Math.PI) / 3, 0]}>
          <boxGeometry args={[0.04, 0.04, 1.52]} />
          <SilverMaterial roughness={0.24} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.78]} rotation={[0.12, 0.35, 0.08]}>
        <boxGeometry args={[0.04, 0.42, 0.72]} />
        <ChassisMaterial />
      </mesh>
    </Spin>
  );
}

export function VesselKind({ accent, segs }: KindProps) {
  return (
    <Spin speed={0.045}>
      <Nucleus radius={0.14} accent={accent} />
      <mesh rotation={[Math.PI, 0, 0]} position={[0, -0.08, 0]}>
        <cylinderGeometry args={[0.78, 0.26, 0.7, segs, 1, true]} />
        <ChassisMaterial roughness={0.24} />
      </mesh>
      <mesh position={[0, 0.26, 0]} rotation={[1.57, 0, 0]}>
        <torusGeometry args={[0.78, 0.028, 10, segs]} />
        <SilverMaterial />
      </mesh>
      <mesh position={[0, -0.06, 0]}>
        <sphereGeometry args={[0.28, 16, 12]} />
        <AccentGlow accent={accent} opacity={0.55} />
      </mesh>
    </Spin>
  );
}

export function SoftKind({ accent, segs }: KindProps) {
  return (
    <Spin speed={0.045}>
      <Nucleus radius={0.18} accent={accent} />
      <mesh position={[0.08, 0.06, 0]}>
        <sphereGeometry args={[0.62, segs, segs]} />
        <ChassisMaterial roughness={0.36} />
      </mesh>
      <mesh position={[-0.38, -0.08, 0.12]}>
        <sphereGeometry args={[0.38, Math.max(12, segs / 2), Math.max(12, segs / 2)]} />
        <ChassisMaterial roughness={0.36} />
      </mesh>
      <mesh position={[0.42, 0.18, 0.16]}>
        <sphereGeometry args={[0.22, 12, 12]} />
        <SilverMaterial roughness={0.22} />
      </mesh>
      <AccentSlit position={[0.08, 0.08, 0.62]} size={[0.28, 0.03, 0.02]} accent={accent} />
    </Spin>
  );
}

'use client';

import { Anodized, Brushed, Graphite } from '@/scene/kit/materials';
import { FramedPanel, Slit } from '@/scene/kit/parts';
import type { VesselKind } from '@/scene/universe/identities';

export function Vessel({ kind, accent }: { kind: VesselKind; accent: string }) {
  return (
    <group>
      {kind === 'hall' ? <Hall accent={accent} /> : null}
      {kind === 'mast' ? <Mast accent={accent} /> : null}
      {kind === 'spire' ? <Spire accent={accent} /> : null}
      {kind === 'stack' ? <Stack accent={accent} /> : null}
      {kind === 'cabinet' ? <Cabinet accent={accent} /> : null}
    </group>
  );
}

function Hall({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[2.85, 1.8, 1.55]} />
        <Anodized roughness={0.2} />
      </mesh>
      <mesh position={[0, 1.86, 0]}>
        <boxGeometry args={[3.05, 0.14, 1.7]} />
        <Brushed roughness={0.16} />
      </mesh>
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[2.95, 0.16, 1.65]} />
        <Graphite roughness={0.36} />
      </mesh>
      {[-1.15, 1.15].map((x) => (
        <mesh key={x} position={[x, 0.95, 0.72]}>
          <boxGeometry args={[0.12, 1.55, 0.12]} />
          <Brushed roughness={0.2} />
        </mesh>
      ))}
      <group position={[0, 0.95, 0.8]}>
        <FramedPanel width={2.2} height={1.35} accent={accent} />
      </group>
      <group position={[1.45, 0.95, 0]} rotation={[0, Math.PI / 2, 0]}>
        <FramedPanel width={1.2} height={1.35} accent={accent} />
      </group>
      <Slit position={[0, 1.95, 0.86]} size={[1.15, 0.03, 0.03]} accent={accent} intensity={0.65} />
    </group>
  );
}

function Mast({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 1.15, 0]}>
        <boxGeometry args={[0.55, 2.3, 0.55]} />
        <Anodized roughness={0.18} />
      </mesh>
      {[0.55, 1.15, 1.75].map((y, i) => (
        <mesh key={y} position={[0.15, y, 0.28]}>
          <boxGeometry args={[1.15 - i * 0.18, 0.1, 0.22]} />
          <Graphite roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 2.38, 0]}>
        <boxGeometry args={[0.68, 0.14, 0.68]} />
        <Brushed roughness={0.16} />
      </mesh>
      <Slit position={[0, 2.38, 0.36]} size={[0.22, 0.04, 0.02]} accent={accent} />
    </group>
  );
}

function Spire({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[1.15, 1.7, 1.15]} />
        <Graphite roughness={0.32} />
      </mesh>
      <mesh position={[0, 1.85, 0]}>
        <boxGeometry args={[0.72, 0.42, 0.72]} />
        <Anodized roughness={0.18} />
      </mesh>
      <mesh position={[0, 2.18, 0]}>
        <cylinderGeometry args={[0.12, 0.28, 0.28, 8]} />
        <Brushed roughness={0.14} />
      </mesh>
      <group position={[0, 0.95, 0.59]}>
        <FramedPanel width={0.72} height={1.05} accent={accent} thickness={0.04} />
      </group>
      <Slit position={[0, 1.05, 0.6]} size={[0.1, 0.7, 0.02]} accent={accent} intensity={0.45} />
    </group>
  );
}

function Stack({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.48, 0]}>
        <boxGeometry args={[2.05, 0.96, 1.35]} />
        <Graphite roughness={0.36} />
      </mesh>
      <mesh position={[0.12, 1.22, 0]}>
        <boxGeometry args={[1.55, 0.55, 1.05]} />
        <Anodized roughness={0.2} />
      </mesh>
      <mesh position={[0, 1.58, 0]}>
        <boxGeometry args={[1.15, 0.18, 0.78]} />
        <Brushed roughness={0.16} />
      </mesh>
      <Slit position={[0, 0.62, 0.68]} size={[0.7, 0.03, 0.02]} accent={accent} />
    </group>
  );
}

function Cabinet({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 1.15, 0]}>
        <boxGeometry args={[1.05, 2.3, 0.62]} />
        <Anodized roughness={0.2} />
      </mesh>
      <group position={[0, 1.15, 0.33]}>
        <FramedPanel width={0.82} height={1.95} accent={accent} thickness={0.035} />
      </group>
      {[0.45, 0.95, 1.45, 1.95].map((y) => (
        <mesh key={y} position={[0.54, y, 0]}>
          <boxGeometry args={[0.05, 0.1, 0.48]} />
          <Brushed roughness={0.22} />
        </mesh>
      ))}
      <Slit position={[0, 2.22, 0.34]} size={[0.45, 0.03, 0.02]} accent={accent} />
    </group>
  );
}

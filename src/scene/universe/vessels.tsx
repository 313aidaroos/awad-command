'use client';

import { Anodized, Brushed, Graphite } from '@/scene/kit/materials';
import { Column, FramedPanel, Plinth, Slit } from '@/scene/kit/parts';
import type { VesselKind } from '@/scene/universe/identities';

export function Vessel({ kind, accent }: { kind: VesselKind; accent: string }) {
  return (
    <group>
      <Plinth size={[1.72, 0.16, 1.72]} steps={2} />
      <group position={[0, 0.22, 0]}>
        {kind === 'hall' ? <Hall accent={accent} /> : null}
        {kind === 'mast' ? <Mast accent={accent} /> : null}
        {kind === 'discs' ? <Discs accent={accent} /> : null}
        {kind === 'spire' ? <Spire accent={accent} /> : null}
        {kind === 'stack' ? <Stack accent={accent} /> : null}
        {kind === 'cabinet' ? <Cabinet accent={accent} /> : null}
        {kind === 'cluster' ? <Cluster accent={accent} /> : null}
        {kind === 'folios' ? <Folios accent={accent} /> : null}
        {kind === 'stage' ? <Stage accent={accent} /> : null}
        {kind === 'tent' ? <Tent accent={accent} /> : null}
        {kind === 'urn' ? <Urn accent={accent} /> : null}
      </group>
    </group>
  );
}

function Hall({ accent }: { accent: string }) {
  return (
    <group>
      {[
        [-0.62, -0.52],
        [0.62, -0.52],
        [-0.62, 0.52],
        [0.62, 0.52],
      ].map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0, z]}>
          <Column height={1.85} width={0.12} />
        </group>
      ))}
      <mesh position={[0, 1.92, 0]}>
        <boxGeometry args={[1.48, 0.08, 1.28]} />
        <Graphite roughness={0.36} />
      </mesh>
      <mesh position={[0, 2.02, 0]}>
        <boxGeometry args={[1.2, 0.06, 0.08]} />
        <Brushed roughness={0.24} />
      </mesh>
      <group position={[0, 0.95, 0.64]}>
        <FramedPanel width={1.28} height={1.35} accent={accent} />
      </group>
      <group position={[0, 0.95, -0.64]}>
        <FramedPanel width={1.28} height={1.35} accent={accent} />
      </group>
      <group position={[0.72, 0.95, 0]} rotation={[0, Math.PI / 2, 0]}>
        <FramedPanel width={1.05} height={1.35} accent={accent} />
      </group>
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[1.35, 0.06, 1.15]} />
        <Brushed roughness={0.3} />
      </mesh>
      <Slit position={[0, 0.08, 0.7]} size={[0.7, 0.02, 0.02]} accent={accent} />
      <Slit position={[0, 1.88, 0]} size={[0.9, 0.02, 0.02]} accent={accent} intensity={0.55} />
    </group>
  );
}

function Mast({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.07, 0.11, 1.9, 8]} />
        <Anodized />
      </mesh>
      {[0.55, 1.05, 1.55].map((y, i) => (
        <mesh key={y} position={[0, y, 0]} rotation={[0.2 + i * 0.15, i * 0.4, 0]}>
          <boxGeometry args={[1.15 - i * 0.18, 0.04, 0.28]} />
          <Graphite roughness={0.34} />
        </mesh>
      ))}
      <mesh position={[0, 1.95, 0]}>
        <boxGeometry args={[0.22, 0.22, 0.22]} />
        <Brushed roughness={0.2} />
      </mesh>
      <Slit position={[0, 1.95, 0.12]} size={[0.08, 0.08, 0.02]} accent={accent} />
    </group>
  );
}

function Discs({ accent }: { accent: string }) {
  const rs = [0.78, 0.62, 0.48, 0.34];
  return (
    <group>
      <mesh position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 1.9, 8]} />
        <Brushed roughness={0.24} />
      </mesh>
      {rs.map((r, i) => (
        <mesh key={r} position={[0, 0.28 + i * 0.38, 0]}>
          <cylinderGeometry args={[r, r, 0.08, 24]} />
          <Graphite roughness={0.32} />
        </mesh>
      ))}
      <Slit position={[0.5, 0.32, 0]} size={[0.18, 0.02, 0.02]} accent={accent} />
    </group>
  );
}

function Spire({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.72, 1.1, 0.72]} />
        <Graphite roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.35, 0]}>
        <boxGeometry args={[0.48, 0.72, 0.48]} />
        <Graphite roughness={0.36} />
      </mesh>
      <mesh position={[0, 1.92, 0]}>
        <octahedronGeometry args={[0.28, 0]} />
        <Brushed roughness={0.2} />
      </mesh>
      <Slit position={[0, 0.7, 0.37]} size={[0.12, 0.55, 0.02]} accent={accent} intensity={0.5} />
    </group>
  );
}

function Stack({ accent }: { accent: string }) {
  const slabs: Array<[number, number, number]> = [
    [1.45, 0.28, 0.95],
    [1.15, 0.32, 0.78],
    [0.88, 0.38, 0.62],
  ];
  return (
    <group>
      {slabs.map((s, i) => (
        <mesh key={i} position={[0, 0.2 + i * 0.42, 0]}>
          <boxGeometry args={s} />
          <Graphite roughness={0.44} />
        </mesh>
      ))}
      <Slit position={[0, 0.34, 0.49]} size={[0.4, 0.02, 0.02]} accent={accent} />
    </group>
  );
}

function Cabinet({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[0.85, 1.9, 0.55]} />
        <Anodized roughness={0.28} />
      </mesh>
      <group position={[0, 0.95, 0.28]}>
        <FramedPanel width={0.72} height={1.62} accent={accent} thickness={0.03} />
      </group>
      {[0.35, 0.7, 1.05, 1.4].map((y) => (
        <mesh key={y} position={[0.44, y, 0]}>
          <boxGeometry args={[0.04, 0.08, 0.42]} />
          <Graphite roughness={0.4} />
        </mesh>
      ))}
      <Slit position={[0, 1.82, 0.29]} size={[0.4, 0.03, 0.02]} accent={accent} />
    </group>
  );
}

function Cluster({ accent }: { accent: string }) {
  const towers: Array<[number, number, number, number]> = [
    [0, 1.15, 0, 0.28],
    [0.42, 0.72, 0.18, 0.18],
    [-0.38, 0.55, 0.22, 0.16],
    [0.18, 0.42, -0.4, 0.14],
  ];
  return (
    <group>
      {towers.map(([x, h, z, w]) => (
        <mesh key={`${x}${z}`} position={[x, h / 2, z]}>
          <boxGeometry args={[w, h, w]} />
          <Graphite roughness={0.34} />
        </mesh>
      ))}
      <Slit position={[0, 1.12, 0.15]} size={[0.08, 0.4, 0.02]} accent={accent} />
    </group>
  );
}

function Folios({ accent }: { accent: string }) {
  return (
    <group>
      {[-0.42, -0.21, 0, 0.21, 0.42].map((x, i) => (
        <mesh key={x} position={[x, 0.85, 0]} rotation={[0, i * 0.08 - 0.16, 0]}>
          <boxGeometry args={[0.12, 1.7, 1.05]} />
          <Graphite roughness={0.4} />
        </mesh>
      ))}
      <Slit position={[0, 1.62, 0.54]} size={[0.7, 0.02, 0.02]} accent={accent} />
    </group>
  );
}

function Stage({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.28, 0]}>
        <boxGeometry args={[1.55, 0.55, 1.05]} />
        <Graphite roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.72, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.55, 0.55, 0.22, 24]} />
        <Anodized />
      </mesh>
      <mesh position={[0.72, 0.72, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.42, 0.42, 0.12, 20]} />
        <Brushed roughness={0.22} />
      </mesh>
      <Slit position={[0, 0.58, 0.54]} size={[0.8, 0.02, 0.02]} accent={accent} />
    </group>
  );
}

function Tent({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.72, 0.85, 0.7, 6]} />
        <Graphite roughness={0.42} />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <cylinderGeometry args={[0.12, 0.72, 0.85, 6]} />
        <Graphite roughness={0.36} />
      </mesh>
      <Slit position={[0, 0.42, 0.74]} size={[0.35, 0.04, 0.02]} accent={accent} />
    </group>
  );
}

function Urn({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.55, 0.42, 0.7, 12]} />
        <Graphite roughness={0.38} />
      </mesh>
      <mesh position={[0, 0.85, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.48, 0.05, 8, 24]} />
        <Brushed roughness={0.22} />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.22, 0.38, 0.45, 10]} />
        <Anodized />
      </mesh>
      <Slit position={[0, 0.4, 0.56]} size={[0.2, 0.08, 0.02]} accent={accent} />
    </group>
  );
}

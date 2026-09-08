'use client';

import { Anodized, Brushed, Graphite } from '@/scene/kit/materials';
import { FramedPanel, Slit } from '@/scene/kit/parts';
import type { VesselKind } from '@/scene/universe/identities';

export function Vessel({ kind, accent }: { kind: VesselKind; accent: string }) {
  return (
    <group>
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
  );
}

function Hall({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[2.35, 0.16, 1.55]} />
        <Graphite roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[2.15, 1.55, 1.28]} />
        <Anodized roughness={0.26} />
      </mesh>
      <mesh position={[0, 1.78, 0]}>
        <boxGeometry args={[2.28, 0.12, 1.4]} />
        <Brushed roughness={0.2} />
      </mesh>
      <group position={[0, 0.95, 0.66]}>
        <FramedPanel width={1.7} height={1.2} accent={accent} />
      </group>
      <group position={[1.1, 0.95, 0]} rotation={[0, Math.PI / 2, 0]}>
        <FramedPanel width={1.05} height={1.2} accent={accent} />
      </group>
      <Slit position={[0, 1.86, 0.72]} size={[0.9, 0.03, 0.03]} accent={accent} intensity={0.7} />
    </group>
  );
}

function Mast({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[0.42, 1.9, 0.42]} />
        <Anodized roughness={0.22} />
      </mesh>
      <mesh position={[0, 0.55, 0.28]}>
        <boxGeometry args={[0.95, 0.12, 0.22]} />
        <Graphite roughness={0.32} />
      </mesh>
      <mesh position={[0, 1.15, 0.22]}>
        <boxGeometry args={[0.72, 0.1, 0.18]} />
        <Graphite roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.95, 0]}>
        <boxGeometry args={[0.5, 0.12, 0.5]} />
        <Brushed roughness={0.18} />
      </mesh>
      <Slit position={[0, 1.95, 0.26]} size={[0.18, 0.04, 0.02]} accent={accent} />
    </group>
  );
}

function Discs({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.95, 1.05, 1.1, 8]} />
        <Graphite roughness={0.34} />
      </mesh>
      <mesh position={[0, 1.25, 0]}>
        <cylinderGeometry args={[0.72, 0.88, 0.35, 8]} />
        <Anodized roughness={0.2} />
      </mesh>
      <mesh position={[0, 1.52, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.62, 0.04, 8, 32]} />
        <Brushed roughness={0.16} />
      </mesh>
      <Slit position={[0, 1.12, 0.92]} size={[0.28, 0.03, 0.03]} accent={accent} />
    </group>
  );
}

function Spire({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[0.95, 1.4, 0.95]} />
        <Graphite roughness={0.36} />
      </mesh>
      <mesh position={[0, 1.55, 0]}>
        <boxGeometry args={[0.62, 0.35, 0.62]} />
        <Brushed roughness={0.2} />
      </mesh>
      <Slit position={[0, 0.85, 0.48]} size={[0.1, 0.7, 0.02]} accent={accent} intensity={0.45} />
    </group>
  );
}

function Stack({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.38, 0]}>
        <boxGeometry args={[1.7, 0.76, 1.15]} />
        <Graphite roughness={0.4} />
      </mesh>
      <mesh position={[0.12, 1.05, 0]}>
        <boxGeometry args={[1.25, 0.58, 0.88]} />
        <Anodized roughness={0.26} />
      </mesh>
      <Slit position={[0, 0.52, 0.58]} size={[0.55, 0.03, 0.02]} accent={accent} />
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
  return (
    <group>
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[1.15, 1.7, 0.85]} />
        <Graphite roughness={0.34} />
      </mesh>
      <mesh position={[0.55, 0.45, 0.28]}>
        <boxGeometry args={[0.55, 0.9, 0.48]} />
        <Anodized roughness={0.24} />
      </mesh>
      <Slit position={[0, 1.45, 0.44]} size={[0.35, 0.04, 0.02]} accent={accent} />
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
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[1.75, 0.84, 1.2]} />
        <Graphite roughness={0.38} />
      </mesh>
      <mesh position={[0, 0.92, 0.52]}>
        <boxGeometry args={[1.35, 0.12, 0.08]} />
        <Brushed roughness={0.2} />
      </mesh>
      <Slit position={[0, 0.88, 0.62]} size={[0.7, 0.03, 0.02]} accent={accent} />
    </group>
  );
}

function Tent({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.82, 0.98, 1.1, 6]} />
        <Graphite roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.25, 0]}>
        <cylinderGeometry args={[0.28, 0.72, 0.35, 6]} />
        <Anodized roughness={0.24} />
      </mesh>
      <Slit position={[0, 0.55, 0.9]} size={[0.3, 0.04, 0.02]} accent={accent} />
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

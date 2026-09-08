'use client';

import { useState } from 'react';
import { Anodized, Brushed, Graphite } from '@/scene/kit/materials';
import { FramedPanel, Slit } from '@/scene/kit/parts';
import { FloatingLabel } from '@/scene/ui/FloatingLabel';
import { WorldName } from '@/scene/ui/WorldName';
import { useCommandStore } from '@/store/useCommandStore';
import type { WorldNode } from '@/types/world';

export function WorldNodeMesh({ node, accent }: { node: WorldNode; accent: string }) {
  const [hovered, setHovered] = useState(false);
  const tracked = useCommandStore((s) => {
    const id = s.followingAgent;
    if (!id) return false;
    const agent = s.agents[id];
    return agent?.targetNodeId === node.id || agent?.fromNodeId === node.id;
  });
  if (node.kind === 'screen') return null;
  const showLabel = hovered || tracked;
  return (
    <group
      position={node.position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <Workstation accent={accent} kind={node.kind} />
      {showLabel ? (
        <FloatingLabel
          id={`node-${node.id}`}
          priority={hovered ? 5 : tracked ? 4 : 1}
          maxDist={hovered || tracked ? 28 : 16}
          fadeFrom={hovered || tracked ? 18 : 9}
          position={[0, 1.72, 0]}
        >
          <WorldName primary={hovered || tracked}>{node.label}</WorldName>
        </FloatingLabel>
      ) : null}
    </group>
  );
}

function Workstation({ accent, kind }: { accent: string; kind: WorldNode['kind'] }) {
  const w = kind === 'sink' ? 1.85 : kind === 'source' ? 1.7 : 1.55;
  return (
    <group>
      <mesh position={[0, 0.06, 0.05]}>
        <boxGeometry args={[w + 0.15, 0.1, 1.15]} />
        <Graphite roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.72, 0.08]}>
        <boxGeometry args={[w, 0.07, 0.72]} />
        <Graphite roughness={0.14} metalness={0.96} />
      </mesh>
      {[-0.28, 0.28].map((x) => (
        <group key={x} position={[x * (w / 1.55), 1.12, -0.28]}>
          <mesh>
            <boxGeometry args={[0.62, 0.48, 0.05]} />
            <Anodized roughness={0.16} />
          </mesh>
          <group position={[0, 0, 0.04]}>
            <FramedPanel width={0.52} height={0.38} accent={accent} thickness={0.02} />
          </group>
        </group>
      ))}
      <mesh position={[0, 0.78, 0.22]}>
        <boxGeometry args={[w * 0.42, 0.03, 0.18]} />
        <Anodized roughness={0.24} />
      </mesh>
      <mesh position={[0.52, 1.35, 0.1]}>
        <cylinderGeometry args={[0.03, 0.04, 0.28, 8]} />
        <Brushed roughness={0.2} />
      </mesh>
      <mesh position={[0.52, 1.5, 0.1]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial color="#F0E6D4" emissive="#F0E6D4" emissiveIntensity={0.55} roughness={0.35} />
      </mesh>
      <Slit
        position={[0, 1.38, -0.28]}
        size={[kind === 'sink' ? 0.7 : 0.28, 0.02, 0.02]}
        accent={accent}
        intensity={kind === 'sink' ? 0.85 : 0.45}
      />
    </group>
  );
}

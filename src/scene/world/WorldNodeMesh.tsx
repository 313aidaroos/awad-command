'use client';

import { useState } from 'react';
import { Anodized, Graphite } from '@/scene/kit/materials';
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
      <Bay accent={accent} kind={node.kind} />
      {showLabel ? (
        <FloatingLabel
          id={`node-${node.id}`}
          priority={hovered ? 5 : tracked ? 4 : 1}
          maxDist={hovered || tracked ? 28 : 16}
          fadeFrom={hovered || tracked ? 18 : 9}
          position={[0, 1.85, 0]}
        >
          <WorldName primary={hovered || tracked}>{node.label}</WorldName>
        </FloatingLabel>
      ) : null}
    </group>
  );
}

function Bay({ accent, kind }: { accent: string; kind: WorldNode['kind'] }) {
  const w = kind === 'sink' ? 1.7 : kind === 'source' ? 1.55 : 1.4;
  return (
    <group>
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[w, 0.12, 1.15]} />
        <Graphite roughness={0.42} />
      </mesh>
      <mesh position={[0, 0.72, -0.42]}>
        <boxGeometry args={[w * 0.92, 1.15, 0.1]} />
        <Anodized roughness={0.3} />
      </mesh>
      <group position={[0, 0.78, -0.36]}>
        <FramedPanel width={w * 0.78} height={0.85} accent={accent} thickness={0.03} />
      </group>
      <mesh position={[0, 0.42, 0.12]}>
        <boxGeometry args={[w * 0.7, 0.08, 0.55]} />
        <Anodized roughness={0.26} />
      </mesh>
      <Slit
        position={[0, 1.28, -0.36]}
        size={[kind === 'sink' ? 0.55 : 0.32, 0.03, 0.02]}
        accent={accent}
        intensity={kind === 'sink' ? 0.9 : 0.55}
      />
    </group>
  );
}

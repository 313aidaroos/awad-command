'use client';

import { useState } from 'react';
import { KitModel } from '@/scene/kit/KitModel';
import { FloatingLabel } from '@/scene/ui/FloatingLabel';
import { WorldName } from '@/scene/ui/WorldName';
import { useCommandStore } from '@/store/useCommandStore';
import type { WorldNode } from '@/types/world';

function Station({ accent, kind }: { accent: string; kind: WorldNode['kind'] }) {
  const sink = kind === 'sink';
  const source = kind === 'source';
  return (
    <group>
      <KitModel name="deskComputer" metalize tint={accent} scale={2.15} />
      <KitModel name="computer" position={[0.02, 0, -0.42]} scale={0.85} />
      <KitModel name="deskChair" metalize tint="#8A909A" position={[0.15, 0, 0.55]} scale={1.8} rotation={[0, Math.PI, 0]} />
      {source ? <KitModel name="accessPoint" position={[-0.72, 0, -0.15]} scale={0.9} /> : null}
      {sink ? <KitModel name="chest" position={[0.85, 0, 0.1]} scale={0.85} /> : null}
      {!source && !sink ? <KitModel name="crate" position={[-0.78, 0, 0.22]} scale={0.7} /> : null}
    </group>
  );
}

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
      <Station accent={accent} kind={node.kind} />
      {showLabel ? (
        <FloatingLabel
          id={`node-${node.id}`}
          priority={hovered ? 5 : tracked ? 4 : 1}
          maxDist={hovered || tracked ? 22 : 14}
          fadeFrom={hovered || tracked ? 14 : 8}
          position={[0, 1.85, 0]}
        >
          <WorldName primary={hovered || tracked}>{node.label}</WorldName>
        </FloatingLabel>
      ) : null}
    </group>
  );
}

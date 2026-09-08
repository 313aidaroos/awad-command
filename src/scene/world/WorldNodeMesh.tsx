'use client';

import { useState } from 'react';
import { ChassisMaterial } from '@/scene/materials/ChassisMaterial';
import { SilverMaterial } from '@/scene/materials/SilverMaterial';
import { FloatingLabel } from '@/scene/ui/FloatingLabel';
import { WorldName } from '@/scene/ui/WorldName';
import { useCommandStore } from '@/store/useCommandStore';
import type { WorldNode } from '@/types/world';

function StationBay({ altar }: { altar: boolean }) {
  if (altar) {
    return (
      <group>
        <mesh>
          <boxGeometry args={[1.35, 2.55, 1.15]} />
          <ChassisMaterial roughness={0.46} />
        </mesh>
        <mesh position={[0, 0.55, 0.58]}>
          <boxGeometry args={[0.42, 0.016, 0.012]} />
          <SilverMaterial roughness={0.22} />
        </mesh>
      </group>
    );
  }
  return (
    <group>
      <mesh>
        <boxGeometry args={[1.72, 2.15, 0.72]} />
        <ChassisMaterial roughness={0.48} />
      </mesh>
      <mesh position={[0, 0.42, 0.37]}>
        <boxGeometry args={[0.28, 0.014, 0.01]} />
        <SilverMaterial roughness={0.24} />
      </mesh>
    </group>
  );
}

export function WorldNodeMesh({ node }: { node: WorldNode; accent: string }) {
  const [hovered, setHovered] = useState(false);
  const following = useCommandStore((s) => Boolean(s.followingAgent));
  const tracked = useCommandStore((s) => {
    const id = s.followingAgent;
    if (!id) return false;
    const agent = s.agents[id];
    return agent?.targetNodeId === node.id || agent?.fromNodeId === node.id;
  });
  if (node.kind === 'screen') return null;
  const altar = node.kind === 'sink';
  const showLabel = hovered || tracked;
  const priority = hovered ? 5 : tracked ? 4 : 1;
  return (
    <group
      position={node.position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <StationBay altar={altar} />
      {showLabel && !following ? (
        <FloatingLabel
          id={`node-${node.id}`}
          priority={priority}
          maxDist={hovered || tracked ? 28 : 16}
          fadeFrom={hovered || tracked ? 18 : 9}
          position={[0, altar ? 1.55 : 1.28, 0]}
        >
          <WorldName primary={hovered || tracked}>{node.label}</WorldName>
        </FloatingLabel>
      ) : null}
    </group>
  );
}

'use client';

import { useState } from 'react';
import { AccentGlow } from '@/scene/materials/AccentGlow';
import { ChassisMaterial } from '@/scene/materials/ChassisMaterial';
import { SilverMaterial } from '@/scene/materials/SilverMaterial';
import { Deck } from '@/scene/universe/parts';
import { FloatingLabel } from '@/scene/ui/FloatingLabel';
import { WorldName } from '@/scene/ui/WorldName';
import { useCommandStore } from '@/store/useCommandStore';
import type { WorldNode } from '@/types/world';

type Shape = 'cluster' | 'funnel' | 'filter' | 'stack' | 'rings' | 'chevron' | 'block' | 'hex' | 'crystal' | 'generic';

const SHAPE: Record<string, Shape> = {
  Customers: 'cluster',
  'Lead Gen': 'funnel',
  Qualification: 'filter',
  Database: 'stack',
  Matching: 'rings',
  Sales: 'chevron',
  Contractor: 'block',
  Job: 'hex',
  Revenue: 'crystal',
};

function Station({ shape, color }: { shape: Shape; color: string }) {
  if (shape === 'cluster') {
    return (
      <group>
        {([-0.2, 0.2] as const).map((x) => (
          <mesh key={x} position={[x, 0.12, x * 0.35]}>
            <sphereGeometry args={[0.18, 20, 16]} />
            <ChassisMaterial />
          </mesh>
        ))}
        <mesh position={[0, 0.12, 0]}>
          <sphereGeometry args={[0.07, 10, 8]} />
          <AccentGlow accent={color} />
        </mesh>
      </group>
    );
  }
  if (shape === 'funnel') {
    return (
      <group>
        <mesh rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.34, 0.62, 20]} />
          <ChassisMaterial roughness={0.24} />
        </mesh>
        <mesh position={[0, 0.28, 0]}>
          <torusGeometry args={[0.2, 0.016, 8, 20]} />
          <SilverMaterial />
        </mesh>
      </group>
    );
  }
  if (shape === 'filter') {
    return (
      <group>
        <mesh rotation={[1.2, 0, 0]}>
          <torusGeometry args={[0.3, 0.045, 8, 24]} />
          <ChassisMaterial />
        </mesh>
        <mesh rotation={[1.2, 0, 0]}>
          <torusGeometry args={[0.3, 0.012, 8, 24]} />
          <SilverMaterial />
        </mesh>
      </group>
    );
  }
  if (shape === 'stack') {
    return (
      <group>
        {[0, 0.16, 0.32].map((y) => (
          <mesh key={y} position={[0, y - 0.08, 0]}>
            <cylinderGeometry args={[0.3 - y * 0.1, 0.3 - y * 0.1, 0.1, 16]} />
            <ChassisMaterial />
          </mesh>
        ))}
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.5, 8]} />
          <AccentGlow accent={color} opacity={0.7} />
        </mesh>
      </group>
    );
  }
  if (shape === 'rings') {
    return (
      <group>
        <mesh rotation={[1.2, 0.3, 0]}>
          <torusGeometry args={[0.3, 0.04, 8, 24]} />
          <ChassisMaterial />
        </mesh>
        <mesh rotation={[0.4, 0.8, 0.2]}>
          <torusGeometry args={[0.22, 0.018, 8, 20]} />
          <SilverMaterial />
        </mesh>
      </group>
    );
  }
  if (shape === 'chevron') {
    return (
      <group>
        <mesh rotation={[0.35, 0.5, 0.15]}>
          <tetrahedronGeometry args={[0.36, 0]} />
          <ChassisMaterial />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
          <octahedronGeometry args={[0.08, 0]} />
          <AccentGlow accent={color} />
        </mesh>
      </group>
    );
  }
  if (shape === 'block') {
    return (
      <group>
        <mesh>
          <boxGeometry args={[0.48, 0.34, 0.48]} />
          <ChassisMaterial />
        </mesh>
        <mesh>
          <boxGeometry args={[0.5, 0.04, 0.5]} />
          <SilverMaterial />
        </mesh>
      </group>
    );
  }
  if (shape === 'hex') {
    return (
      <mesh rotation={[0.5, 0.15, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.16, 8]} />
        <ChassisMaterial />
      </mesh>
    );
  }
  if (shape === 'crystal') {
    return (
      <group>
        <mesh>
          <octahedronGeometry args={[0.34, 0]} />
          <ChassisMaterial roughness={0.2} />
        </mesh>
        <mesh>
          <octahedronGeometry args={[0.1, 0]} />
          <AccentGlow accent={color} />
        </mesh>
      </group>
    );
  }
  return (
    <mesh>
      <octahedronGeometry args={[0.2, 0]} />
      <ChassisMaterial />
    </mesh>
  );
}

export function WorldNodeMesh({ node, accent }: { node: WorldNode; accent: string }) {
  const [hovered, setHovered] = useState(false);
  const following = useCommandStore((s) => Boolean(s.followingAgent));
  const tracked = useCommandStore((s) => {
    const id = s.followingAgent;
    if (!id) return false;
    const agent = s.agents[id];
    return agent?.targetNodeId === node.id || agent?.fromNodeId === node.id;
  });
  if (node.kind === 'screen') return null;
  const shape = SHAPE[node.label] ?? (node.kind === 'sink' ? 'crystal' : node.kind === 'source' ? 'cluster' : 'generic');
  const showLabel = hovered || !following;
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
      <Deck radius={0.52} />
      <group scale={1.35}>
        <Station shape={shape} color={accent} />
      </group>
      {showLabel ? (
        <FloatingLabel
          id={`node-${node.id}`}
          priority={priority}
          maxDist={hovered || tracked ? 28 : 16}
          fadeFrom={hovered || tracked ? 18 : 9}
          position={[0, 0.92, 0]}
        >
          <WorldName primary={hovered || tracked}>{node.label}</WorldName>
        </FloatingLabel>
      ) : null}
    </group>
  );
}

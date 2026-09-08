'use client';

import { useState } from 'react';
import { Edges } from '@react-three/drei';
import { GlassMaterial } from '@/scene/materials/GlassMaterial';
import { FloatingLabel } from '@/scene/ui/FloatingLabel';
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
        {([-0.22, 0.22] as const).map((x) => (
          <mesh key={x} position={[x, 0.08, x * 0.4]}>
            <sphereGeometry args={[0.2, 18, 18]} />
            <GlassMaterial accent={color} opacity={0.78} />
          </mesh>
        ))}
      </group>
    );
  }
  if (shape === 'funnel') {
    return (
      <mesh rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.38, 0.68, 16]} />
        <GlassMaterial accent={color} opacity={0.74} />
        <Edges threshold={20} color={color} />
      </mesh>
    );
  }
  if (shape === 'filter') {
    return (
      <mesh rotation={[1.2, 0, 0]}>
        <torusGeometry args={[0.34, 0.06, 10, 28]} />
        <GlassMaterial accent={color} opacity={0.72} />
      </mesh>
    );
  }
  if (shape === 'stack') {
    return (
      <group>
        {[0, 0.16, 0.32].map((y) => (
          <mesh key={y} position={[0, y - 0.1, 0]}>
            <cylinderGeometry args={[0.32 - y * 0.12, 0.32 - y * 0.12, 0.11, 16]} />
            <GlassMaterial accent={color} opacity={0.76} />
          </mesh>
        ))}
      </group>
    );
  }
  if (shape === 'rings') {
    return (
      <group>
        <mesh rotation={[1.2, 0.3, 0]}>
          <torusGeometry args={[0.32, 0.035, 10, 28]} />
          <GlassMaterial accent={color} opacity={0.72} />
        </mesh>
        <mesh rotation={[0.4, 0.8, 0.2]}>
          <torusGeometry args={[0.26, 0.03, 10, 24]} />
          <GlassMaterial accent={color} opacity={0.55} />
        </mesh>
      </group>
    );
  }
  if (shape === 'chevron') {
    return (
      <mesh rotation={[0.4, 0.6, 0.2]}>
        <tetrahedronGeometry args={[0.4, 0]} />
        <GlassMaterial accent={color} opacity={0.76} />
        <Edges threshold={18} color={color} />
      </mesh>
    );
  }
  if (shape === 'block') {
    return (
      <mesh>
        <boxGeometry args={[0.5, 0.38, 0.5]} />
        <GlassMaterial accent={color} opacity={0.74} />
        <Edges threshold={15} color={color} />
      </mesh>
    );
  }
  if (shape === 'hex') {
    return (
      <mesh rotation={[0.6, 0.2, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.16, 6]} />
        <GlassMaterial accent={color} opacity={0.74} />
        <Edges threshold={18} color={color} />
      </mesh>
    );
  }
  if (shape === 'crystal') {
    return (
      <mesh>
        <octahedronGeometry args={[0.38, 0]} />
        <GlassMaterial accent={color} opacity={0.8} emissive={0.12} />
        <Edges threshold={18} color={color} />
      </mesh>
    );
  }
  return (
    <mesh>
      <octahedronGeometry args={[0.22, 0]} />
      <GlassMaterial accent={color || '#8A909A'} opacity={0.6} />
    </mesh>
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
  const shape = SHAPE[node.label] ?? (node.kind === 'sink' ? 'crystal' : node.kind === 'source' ? 'cluster' : 'generic');
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
      <group scale={1.7}>
        <Station shape={shape} color={accent} />
      </group>
      <FloatingLabel
        id={`node-${node.id}`}
        priority={priority}
        maxDist={hovered || tracked ? 28 : 16}
        fadeFrom={hovered || tracked ? 18 : 9}
        position={[0, 0.92, 0]}
      >
        <div className="text-[8px] tracking-[0.14em] text-[rgba(230,232,236,0.72)]">{node.label}</div>
      </FloatingLabel>
    </group>
  );
}

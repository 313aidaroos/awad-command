'use client';

import { Html } from '@react-three/drei';
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
            <sphereGeometry args={[0.2, 14, 14]} />
            <meshStandardMaterial color={color} metalness={0.3} roughness={0.45} transparent opacity={0.8} />
          </mesh>
        ))}
      </group>
    );
  }
  if (shape === 'funnel') {
    return (
      <mesh rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.38, 0.68, 10]} />
        <meshStandardMaterial color={color} metalness={0.28} roughness={0.4} transparent opacity={0.78} />
      </mesh>
    );
  }
  if (shape === 'filter') {
    return (
      <mesh rotation={[1.2, 0, 0]}>
        <torusGeometry args={[0.34, 0.07, 8, 22]} />
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.38} transparent opacity={0.75} />
      </mesh>
    );
  }
  if (shape === 'stack') {
    return (
      <group>
        {[0, 0.16, 0.32].map((y) => (
          <mesh key={y} position={[0, y - 0.1, 0]}>
            <cylinderGeometry args={[0.32 - y * 0.12, 0.32 - y * 0.12, 0.12, 12]} />
            <meshStandardMaterial color={color} metalness={0.4} roughness={0.35} transparent opacity={0.8} />
          </mesh>
        ))}
      </group>
    );
  }
  if (shape === 'rings') {
    return (
      <group>
        <mesh rotation={[1.2, 0.3, 0]}>
          <torusGeometry args={[0.32, 0.04, 8, 20]} />
          <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} transparent opacity={0.75} />
        </mesh>
        <mesh rotation={[0.4, 0.8, 0.2]}>
          <torusGeometry args={[0.26, 0.035, 8, 20]} />
          <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} transparent opacity={0.6} />
        </mesh>
      </group>
    );
  }
  if (shape === 'chevron') {
    return (
      <mesh rotation={[0.4, 0.6, 0.2]}>
        <tetrahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial color={color} metalness={0.32} roughness={0.4} transparent opacity={0.8} />
      </mesh>
    );
  }
  if (shape === 'block') {
    return (
      <mesh>
        <boxGeometry args={[0.5, 0.38, 0.5]} />
        <meshStandardMaterial color={color} metalness={0.25} roughness={0.5} transparent opacity={0.78} />
      </mesh>
    );
  }
  if (shape === 'hex') {
    return (
      <mesh rotation={[0.6, 0.2, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.18, 6]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.42} transparent opacity={0.78} />
      </mesh>
    );
  }
  if (shape === 'crystal') {
    return (
      <mesh>
        <octahedronGeometry args={[0.38, 0]} />
        <meshStandardMaterial
          color={color}
          metalness={0.45}
          roughness={0.28}
          transparent
          opacity={0.85}
          emissive={color}
          emissiveIntensity={0.2}
        />
      </mesh>
    );
  }
  if (shape === 'generic' && color) {
    return (
      <mesh>
        <octahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial color={color} metalness={0.25} roughness={0.5} transparent opacity={0.65} />
      </mesh>
    );
  }
  return (
    <mesh>
      <octahedronGeometry args={[0.22, 0]} />
      <meshStandardMaterial color="#8A909A" metalness={0.2} roughness={0.55} transparent opacity={0.6} />
    </mesh>
  );
}

export function WorldNodeMesh({ node, accent }: { node: WorldNode; accent: string }) {
  if (node.kind === 'screen') return null;
  const shape = SHAPE[node.label] ?? (node.kind === 'sink' ? 'crystal' : node.kind === 'source' ? 'cluster' : 'generic');
  return (
    <group position={node.position}>
      <Station shape={shape} color={accent} />
      <Html distanceFactor={22} position={[0, 0.55, 0]} style={{ pointerEvents: 'none' }}>
        <div className="text-[9px] tracking-[0.12em] text-[rgba(230,232,236,0.72)] whitespace-nowrap">{node.label}</div>
      </Html>
    </group>
  );
}

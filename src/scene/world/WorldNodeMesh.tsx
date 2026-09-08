'use client';

import { Html } from '@react-three/drei';
import type { WorldNode } from '@/types/world';

export function WorldNodeMesh({ node }: { node: WorldNode }) {
  const screen = node.kind === 'screen';
  return (
    <group position={node.position}>
      {screen ? (
        <mesh>
          <planeGeometry args={[2.4, 1.35]} />
          <meshBasicMaterial color="#171A1F" transparent opacity={0.7} />
        </mesh>
      ) : (
        <mesh>
          <octahedronGeometry args={[0.22, 0]} />
          <meshBasicMaterial color="#8A909A" transparent opacity={0.55} />
        </mesh>
      )}
      <Html distanceFactor={20} position={[0, screen ? 0.9 : 0.38, 0]} style={{ pointerEvents: 'none' }}>
        <div className="text-[9px] tracking-[0.1em] text-[var(--muted)] whitespace-nowrap">{node.label}</div>
      </Html>
    </group>
  );
}

'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCommandStore } from '@/store/useCommandStore';
import type { ProjectDefinition } from '@/types/project';

export function WorldCore({ project }: { project: ProjectDefinition }) {
  const spin = useRef<THREE.Mesh>(null);
  const runtime = useCommandStore((s) => s.projects[project.slug]);
  const activity = runtime?.activity ?? 0.4;

  useFrame((state, dt) => {
    if (!spin.current) return;
    spin.current.rotation.y += dt * (0.08 + activity * 0.1);
    const s = 0.95 + Math.sin(state.clock.elapsedTime * 0.8) * 0.04;
    spin.current.scale.setScalar(s);
  });

  return (
    <mesh ref={spin}>
      <octahedronGeometry args={[0.55, 0]} />
      <meshStandardMaterial
        color={project.accent}
        metalness={0.45}
        roughness={0.32}
        transparent
        opacity={0.55}
        emissive={project.accent}
        emissiveIntensity={0.16}
      />
    </mesh>
  );
}

'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AccentGlow } from '@/scene/materials/AccentGlow';
import { ChassisMaterial } from '@/scene/materials/ChassisMaterial';
import { SilverMaterial } from '@/scene/materials/SilverMaterial';
import { useCommandStore } from '@/store/useCommandStore';
import type { ProjectDefinition } from '@/types/project';

export function WorldCore({ project }: { project: ProjectDefinition }) {
  const spin = useRef<THREE.Group>(null);
  const runtime = useCommandStore((s) => s.projects[project.slug]);
  const activity = runtime?.activity ?? 0.4;

  useFrame((_, dt) => {
    if (!spin.current) return;
    spin.current.rotation.y += dt * (0.04 + activity * 0.05);
  });

  return (
    <group ref={spin}>
      <mesh>
        <octahedronGeometry args={[0.62, 0]} />
        <ChassisMaterial roughness={0.36} />
      </mesh>
      <mesh>
        <octahedronGeometry args={[0.1, 0]} />
        <AccentGlow accent={project.accent} opacity={0.55} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.78, 0.02, 8, 48]} />
        <SilverMaterial />
      </mesh>
    </group>
  );
}

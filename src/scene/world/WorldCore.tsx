'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AccentGlow } from '@/scene/materials/AccentGlow';
import { ChassisMaterial } from '@/scene/materials/ChassisMaterial';
import { FresnelShell } from '@/scene/materials/FresnelShell';
import { SilverMaterial } from '@/scene/materials/SilverMaterial';
import { useCommandStore } from '@/store/useCommandStore';
import type { ProjectDefinition } from '@/types/project';

export function WorldCore({ project }: { project: ProjectDefinition }) {
  const spin = useRef<THREE.Group>(null);
  const runtime = useCommandStore((s) => s.projects[project.slug]);
  const activity = runtime?.activity ?? 0.4;

  useFrame((state, dt) => {
    if (!spin.current) return;
    spin.current.rotation.y += dt * (0.06 + activity * 0.08);
    const s = 0.97 + Math.sin(state.clock.elapsedTime * 0.55) * 0.025;
    spin.current.scale.setScalar(s);
  });

  return (
    <group ref={spin}>
      <mesh>
        <octahedronGeometry args={[0.55, 0]} />
        <ChassisMaterial roughness={0.22} />
      </mesh>
      <mesh>
        <octahedronGeometry args={[0.18, 0]} />
        <AccentGlow accent={project.accent} opacity={0.92} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.7, 0.016, 8, 48]} />
        <SilverMaterial />
      </mesh>
      <FresnelShell radius={0.95} accent={project.accent} amp={0.4} alpha={0.55} />
      <pointLight color={project.accent} intensity={0.55} distance={8} />
    </group>
  );
}

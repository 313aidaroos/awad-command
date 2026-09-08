'use client';

import { Canvas } from '@react-three/fiber';
import { CameraRig } from '@/scene/CameraRig';
import { Effects } from '@/scene/Environment/Effects';
import { Lighting } from '@/scene/Environment/Lighting';
import { Starfield } from '@/scene/Environment/Starfield';
import { Universe } from '@/scene/universe/Universe';
import { ProjectWorld } from '@/scene/world/ProjectWorld';
import { useCommandStore } from '@/store/useCommandStore';

export function CommandCanvas() {
  const level = useCommandStore((s) => s.quality.level);
  const dpr: number | [number, number] = level === 'low' ? 1 : level === 'medium' ? [1, 1.5] : [1, 2];

  return (
    <Canvas
      camera={{ position: [0, 4, 22], fov: 45, near: 0.1, far: 300 }}
      dpr={dpr}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.setClearColor('#07080A', 1);
      }}
      style={{ position: 'fixed', inset: 0 }}
    >
      <Lighting />
      <Starfield />
      <Universe />
      <ProjectWorld />
      <CameraRig />
      <Effects />
    </Canvas>
  );
}

'use client';

import { useEffect, useState, type ComponentType } from 'react';
import { Canvas } from '@react-three/fiber';
import { CameraRig } from '@/scene/CameraRig';
import { Lighting } from '@/scene/Environment/Lighting';
import { Starfield } from '@/scene/Environment/Starfield';
import { Universe } from '@/scene/universe/Universe';
import { ProjectWorld } from '@/scene/world/ProjectWorld';
import { useCommandStore } from '@/store/useCommandStore';
import { ClientErrorBoundary } from '@/ui/CanvasErrorBoundary';

function EffectsGate() {
  const level = useCommandStore((s) => s.quality.level);
  const [Fx, setFx] = useState<ComponentType | null>(null);

  useEffect(() => {
    if (level === 'low') {
      setFx(null);
      return;
    }
    let live = true;
    import('@/scene/Environment/Effects')
      .then((mod) => {
        if (live) setFx(() => mod.Effects);
      })
      .catch(() => {
        if (live) setFx(null);
      });
    return () => {
      live = false;
    };
  }, [level]);

  if (!Fx) return null;
  return <Fx />;
}

export function CommandCanvas() {
  const level = useCommandStore((s) => s.quality.level);
  const dpr: number | [number, number] = level === 'low' ? 1 : level === 'medium' ? [1, 1.5] : [1, 2];

  return (
    <Canvas
      camera={{ position: [0, 4, 22], fov: 45, near: 0.1, far: 300 }}
      dpr={dpr}
      gl={{
        antialias: true,
        alpha: false,
        stencil: false,
        powerPreference: 'default',
        failIfMajorPerformanceCaveat: false,
      }}
      onCreated={({ gl }) => {
        gl.setClearColor('#07080A', 1);
        gl.domElement.addEventListener(
          'webglcontextlost',
          (event) => {
            event.preventDefault();
          },
          false,
        );
      }}
      style={{ position: 'fixed', inset: 0 }}
    >
      <Lighting />
      <Starfield />
      <Universe />
      <ProjectWorld />
      <CameraRig />
      <ClientErrorBoundary fallback={null}>
        <EffectsGate />
      </ClientErrorBoundary>
    </Canvas>
  );
}

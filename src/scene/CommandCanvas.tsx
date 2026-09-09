'use client';

import { Suspense, useEffect, useState, type ComponentType, type CSSProperties } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import type { WebGLRenderer } from 'three';
import { isSafariLike } from '@/lib/safari';
import { CameraRig } from '@/scene/CameraRig';
import { Lighting } from '@/scene/Environment/Lighting';
import { StudioEnvironment } from '@/scene/Environment/StudioEnvironment';
import { Starfield } from '@/scene/Environment/Starfield';
import { preloadCommandKit } from '@/scene/kit/preload';
import { showExterior, UNIVERSE_CAM } from '@/scene/lib/cameraPaths';
import { Universe } from '@/scene/universe/Universe';
import { ProjectWorld } from '@/scene/world/ProjectWorld';
import { useCommandStore } from '@/store/useCommandStore';

const CAMERA_INIT = { position: [...UNIVERSE_CAM.position] as [number, number, number], fov: 38, near: 0.2, far: 420 };
const GL_INIT = {
  antialias: true,
  alpha: false,
  stencil: false,
  powerPreference: 'default' as const,
  failIfMajorPerformanceCaveat: false,
};
const CANVAS_STYLE: CSSProperties = { width: '100%', height: '100%', display: 'block' };
const RESIZE = { scroll: false, debounce: { scroll: 50, resize: 75 } };
const DPR_LOW = 1;
const DPR_MED: [number, number] = [1, 1.5];
const DPR_HIGH: [number, number] = [1, 2];

function handleCreated({ gl }: { gl: WebGLRenderer }) {
  gl.setClearColor('#6E8BB8', 1);
  gl.toneMapping = THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = 1.02;
  gl.outputColorSpace = THREE.SRGBColorSpace;
  gl.domElement.addEventListener(
    'webglcontextlost',
    (event) => {
      event.preventDefault();
    },
    false,
  );
  preloadCommandKit();
}

export function CommandCanvas() {
  const level = useCommandStore((s) => s.quality.level);
  const enterPhase = useCommandStore((s) => s.enterPhase);
  const exterior = showExterior(enterPhase);
  const safari = isSafariLike();
  const dpr = safari || level === 'low' ? DPR_LOW : level === 'medium' ? DPR_MED : DPR_HIGH;
  const [Gate, setGate] = useState<ComponentType | null>(null);

  useEffect(() => {
    if (safari) {
      setGate(null);
      return;
    }
    let live = true;
    import('@/scene/Environment/EffectsGate')
      .then((mod) => {
        if (live) setGate(() => mod.EffectsGate);
      })
      .catch(() => {
        if (live) setGate(null);
      });
    return () => {
      live = false;
    };
  }, [safari]);

  return (
    <Canvas
      shadows
      camera={CAMERA_INIT}
      dpr={dpr}
      gl={GL_INIT}
      resize={RESIZE}
      onCreated={handleCreated}
      style={CANVAS_STYLE}
    >
      <fog attach="fog" args={exterior ? ['#C9A07A', 58, 150] : ['#07080A', 18, 44]} />
      <Lighting />
      {exterior ? null : <StudioEnvironment />}
      {exterior ? null : <Starfield />}
      <Suspense fallback={null}>
        <Universe />
        <ProjectWorld />
      </Suspense>
      <CameraRig />
      {safari || !Gate ? null : <Gate />}
    </Canvas>
  );
}

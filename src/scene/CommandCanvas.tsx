'use client';

import { useEffect, useState, type ComponentType, type CSSProperties } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { WebGLRenderer } from 'three';
import { isSafariLike } from '@/lib/safari';
import { CameraRig } from '@/scene/CameraRig';
import { Lighting } from '@/scene/Environment/Lighting';
import { StudioEnvironment } from '@/scene/Environment/StudioEnvironment';
import { showExterior } from '@/scene/lib/cameraPaths';
import { StudioCyc } from '@/scene/universe/StudioCyc';
import { Universe } from '@/scene/universe/Universe';
import { ProjectWorld } from '@/scene/world/ProjectWorld';
import { useCommandStore } from '@/store/useCommandStore';

function SceneAtmosphere() {
  const { scene, gl } = useThree();
  const interior = !showExterior(useCommandStore((s) => s.enterPhase));
  useEffect(() => {
    if (interior) {
      scene.fog = null;
      gl.setClearColor('#1E242C', 1);
      return;
    }
    gl.setClearColor('#161A20', 1);
  }, [gl, interior, scene]);
  if (interior) return null;
  return <fog attach="fog" args={['#161A20', 58, 120]} />;
}

const CAMERA_INIT = { position: [0, 2.4, 11] as [number, number, number], fov: 32, near: 0.1, far: 220 };
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
  gl.setClearColor('#161A20', 1);
  gl.toneMapping = THREE.NeutralToneMapping;
  gl.toneMappingExposure = 1.32;
  gl.outputColorSpace = THREE.SRGBColorSpace;
  gl.domElement.addEventListener(
    'webglcontextlost',
    (event) => {
      event.preventDefault();
    },
    false,
  );
}

export function CommandCanvas() {
  const level = useCommandStore((s) => s.quality.level);
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
      camera={CAMERA_INIT}
      dpr={dpr}
      gl={GL_INIT}
      resize={RESIZE}
      onCreated={handleCreated}
      style={CANVAS_STYLE}
    >
      <SceneAtmosphere />
      <Lighting />
      <StudioEnvironment />
      <StudioCyc />
      <Universe />
      <ProjectWorld />
      <CameraRig />
      {safari || !Gate ? null : <Gate />}
    </Canvas>
  );
}

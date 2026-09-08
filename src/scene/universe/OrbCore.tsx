'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { geoSegments } from '@/lib/quality';
import { pointerGate } from '@/scene/lib/pointer';
import { orbFrag, orbVert } from '@/scene/shaders/orb';
import { STATUS_COLOR } from '@/scene/universe/statusColor';
import { useCommandStore } from '@/store/useCommandStore';
import type { ProjectStatus } from '@/types/project';

interface OrbCoreProps {
  accent: string;
  status: ProjectStatus;
  activity: number;
  hovered: boolean;
  radius?: number;
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
}

export function OrbCore({
  accent,
  status,
  activity,
  hovered,
  radius = 1.1,
  onClick,
  onPointerOver,
  onPointerOut,
}: OrbCoreProps) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: orbVert,
        fragmentShader: orbFrag,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uA: { value: new THREE.Color(accent) },
          uS: { value: new THREE.Color(STATUS_COLOR[status]) },
          uT: { value: 0 },
          uAct: { value: activity },
          uH: { value: 0 },
          uAlpha: { value: 1 },
        },
      }),
    // activity is a uniform written in useFrame — recreate only when colours change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accent, status],
  );
  const hover = useRef(0);
  const segs = geoSegments(useCommandStore((s) => s.quality.level), 48, 32, 20);

  useFrame((_, dt) => {
    mat.uniforms.uT.value = (mat.uniforms.uT.value as number) + dt;
    const act = mat.uniforms.uAct.value as number;
    mat.uniforms.uAct.value = act + (activity - act) * dt * 0.3;
    hover.current += ((hovered ? 1 : 0) - hover.current) * 0.12;
    mat.uniforms.uH.value = hover.current;
  });

  return (
    <mesh
      onClick={(e) => {
        e.stopPropagation();
        if (pointerGate.suppressClick) return;
        onClick?.();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onPointerOver?.();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        onPointerOut?.();
        document.body.style.cursor = 'grab';
      }}
    >
      <sphereGeometry args={[radius, segs, segs]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

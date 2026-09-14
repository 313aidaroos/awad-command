'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { geoSegments } from '@/lib/quality';
import { fresnelFrag, fresnelVert } from '@/scene/shaders/fresnel';
import { useCommandStore } from '@/store/useCommandStore';

export function FresnelShell({
  radius,
  accent,
  amp = 0.55,
  alpha = 0.72,
}: {
  radius: number;
  accent: string;
  amp?: number;
  alpha?: number;
}) {
  const level = useCommandStore((s) => s.quality.level);
  const segs = geoSegments(level, 48, 32, 16);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: fresnelVert,
        fragmentShader: fresnelFrag,
        transparent: true,
        depthWrite: false,
        side: THREE.FrontSide,
        uniforms: {
          uAccent: { value: new THREE.Color(accent) },
          uSilver: { value: new THREE.Color('#E6E8EC') },
          uAmp: { value: amp },
          uAlpha: { value: alpha },
        },
      }),
    [accent, amp, alpha],
  );

  useEffect(
    () => () => {
      mat.dispose();
    },
    [mat],
  );

  if (level === 'low') return null;
  return (
    <mesh>
      <sphereGeometry args={[radius, segs, segs]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

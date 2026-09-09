'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

const DIFF = '/models/ceo/brush_diff.jpg';
const NOR = '/models/ceo/brush_nor.jpg';
const ROUGH = '/models/ceo/brush_rough.jpg';
const METAL = '/models/ceo/brush_metal.jpg';
const GRAIN = new THREE.Vector2(0.55, 0.55);
const CLOSE_GRADE = new THREE.Color('#C4C9D0');
const PLAZA_GRADE = new THREE.Color('#2A2E34');

/** ambientCG Metal024 — brushed steel, not rivet/diamond plate. */
export function BrushedMetal({
  repeat = [1, 1] as [number, number],
  grade = '#C4C9D0',
  distanceGrade = true,
}: {
  repeat?: [number, number];
  grade?: string;
  distanceGrade?: boolean;
}) {
  const material = useRef<THREE.MeshPhysicalMaterial>(null);
  const { camera } = useThree();
  const [srcMap, srcNor, srcRough, srcMetal] = useTexture([DIFF, NOR, ROUGH, METAL]);
  const [map, normalMap, roughnessMap, metalnessMap] = useMemo(() => {
    const cloned = [srcMap, srcNor, srcRough, srcMetal].map((tex) => {
      const next = tex.clone();
      next.needsUpdate = true;
      return next;
    });
    return cloned as [THREE.Texture, THREE.Texture, THREE.Texture, THREE.Texture];
  }, [srcMap, srcMetal, srcNor, srcRough]);

  useLayoutEffect(() => {
    for (const tex of [map, normalMap, roughnessMap, metalnessMap]) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeat[0], repeat[1]);
      tex.anisotropy = 8;
      tex.needsUpdate = true;
    }
    map.colorSpace = THREE.SRGBColorSpace;
    normalMap.colorSpace = THREE.NoColorSpace;
    roughnessMap.colorSpace = THREE.NoColorSpace;
    metalnessMap.colorSpace = THREE.NoColorSpace;
    return () => {
      map.dispose();
      normalMap.dispose();
      roughnessMap.dispose();
      metalnessMap.dispose();
    };
  }, [map, metalnessMap, normalMap, repeat, roughnessMap]);

  useFrame(() => {
    const mat = material.current;
    if (!mat) return;
    if (!distanceGrade) {
      mat.color.set(grade);
      mat.envMapIntensity = 1.35;
      mat.roughness = 0.32;
      return;
    }
    const d = Math.hypot(camera.position.x, camera.position.z);
    const t = THREE.MathUtils.smoothstep(d, 7.1, 14.5);
    mat.color.copy(CLOSE_GRADE).lerp(PLAZA_GRADE, t);
    mat.envMapIntensity = THREE.MathUtils.lerp(1.35, 0.42, t);
    mat.roughness = THREE.MathUtils.lerp(0.32, 0.52, t);
  });

  return (
    <meshPhysicalMaterial
      ref={material}
      map={map}
      normalMap={normalMap}
      normalScale={GRAIN}
      roughnessMap={roughnessMap}
      metalnessMap={metalnessMap}
      color={grade}
      metalness={1}
      roughness={0.32}
      envMapIntensity={1.35}
      clearcoat={0.08}
      clearcoatRoughness={0.55}
    />
  );
}

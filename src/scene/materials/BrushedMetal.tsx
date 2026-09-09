'use client';

import { useLayoutEffect, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

const DIFF = '/models/ceo/brush_diff.jpg';
const NOR = '/models/ceo/brush_nor.jpg';
const ROUGH = '/models/ceo/brush_rough.jpg';
const METAL = '/models/ceo/brush_metal.jpg';
const GRAIN = new THREE.Vector2(0.55, 0.55);

/** ambientCG Metal024 — brushed steel, not rivet/diamond plate. */
export function BrushedMetal({
  repeat = [1, 1] as [number, number],
  grade = '#C4C9D0',
}: {
  repeat?: [number, number];
  grade?: string;
}) {
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

  return (
    <meshPhysicalMaterial
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

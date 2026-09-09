'use client';

import { useLayoutEffect, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

const DIFF = '/models/ceo/plate_diff.jpg';
const NOR = '/models/ceo/plate_nor.jpg';
const ROUGH = '/models/ceo/plate_rough.jpg';
const METAL = '/models/ceo/plate_metal.jpg';

/** Poly Haven riveted metal plate — cloned maps so each mesh can keep its own repeat. */
export function GraphitePlate({
  repeat = [0.78, 0.92] as [number, number],
  grade = '#C5CAD3',
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
      roughnessMap={roughnessMap}
      metalnessMap={metalnessMap}
      color={grade}
      metalness={1}
      roughness={0.34}
      envMapIntensity={0.95}
      clearcoat={0.58}
      clearcoatRoughness={0.18}
      clearcoatNormalMap={normalMap}
    />
  );
}

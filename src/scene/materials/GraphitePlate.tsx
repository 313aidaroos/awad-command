'use client';

import { useLayoutEffect } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

const DIFF = '/models/ceo/plate_diff.jpg';
const NOR = '/models/ceo/plate_nor.jpg';
const ROUGH = '/models/ceo/plate_rough.jpg';
const METAL = '/models/ceo/plate_metal.jpg';

/** Poly Haven riveted metal plate — large features, clearcoat, not a flat grey primitive. */
export function GraphitePlate({
  repeat = [1.1, 1.25] as [number, number],
  grade = '#C5CAD3',
}: {
  repeat?: [number, number];
  grade?: string;
}) {
  const [map, normalMap, roughnessMap, metalnessMap] = useTexture([DIFF, NOR, ROUGH, METAL]);

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
  }, [map, metalnessMap, normalMap, repeat, roughnessMap]);

  return (
    <meshPhysicalMaterial
      map={map}
      normalMap={normalMap}
      roughnessMap={roughnessMap}
      metalnessMap={metalnessMap}
      color={grade}
      metalness={1}
      roughness={0.36}
      envMapIntensity={0.95}
      clearcoat={0.55}
      clearcoatRoughness={0.2}
      clearcoatNormalMap={normalMap}
    />
  );
}

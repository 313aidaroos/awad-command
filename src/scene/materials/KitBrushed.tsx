'use client';

import { useLayoutEffect } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

const COLOR = '/models/megakit/T_Trim_03_BaseColor.png';
const NORMAL = '/models/megakit/T_Trim_03_Normal.png';
const ORM = '/models/megakit/T_Trim_03_ORM.png';

/** MegaKit trim PBR — real brushed metal, not a flat grey primitive. */
export function KitBrushed({
  repeat = [4, 1] as [number, number],
  grade = '#C5CAD3',
  roughness = 0.36,
}: {
  repeat?: [number, number];
  grade?: string;
  roughness?: number;
}) {
  const [map, normalMap, orm] = useTexture([COLOR, NORMAL, ORM]);

  useLayoutEffect(() => {
    for (const tex of [map, normalMap, orm]) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeat[0], repeat[1]);
      tex.anisotropy = 8;
      tex.needsUpdate = true;
    }
    map.colorSpace = THREE.SRGBColorSpace;
    normalMap.colorSpace = THREE.NoColorSpace;
    orm.colorSpace = THREE.NoColorSpace;
  }, [map, normalMap, orm, repeat[0], repeat[1]]);

  return (
    <meshPhysicalMaterial
      map={map}
      normalMap={normalMap}
      roughnessMap={orm}
      metalnessMap={orm}
      color={grade}
      metalness={0.88}
      roughness={roughness}
      envMapIntensity={0.48}
      clearcoat={0.12}
      clearcoatRoughness={0.5}
    />
  );
}

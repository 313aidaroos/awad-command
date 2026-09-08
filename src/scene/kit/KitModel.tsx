'use client';

import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import type { ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { kitUrl, type KitName } from '@/scene/kit/catalog';

export type KitModelProps = ThreeElements['group'] & {
  name: KitName;
  /** Kenney unlit/colormap pieces become studio metals. MegaKit PBR stays. */
  metalize?: boolean;
  tint?: string;
  /** Multiplies albedo even when a map is present — graphite grade, not a wash. */
  grade?: string;
  sit?: boolean;
};

function applyGrade(color: THREE.Color, grade?: string, tint?: string, hasMap?: boolean) {
  if (tint && !hasMap) color.multiply(new THREE.Color(tint));
  if (grade) color.multiply(new THREE.Color(grade));
}

function treatMaterial(mat: THREE.Material, metalize: boolean, tint?: string, grade?: string): THREE.Material {
  const std = mat as THREE.MeshStandardMaterial;
  const map = 'map' in std ? std.map : null;
  const unlit = mat.type === 'MeshBasicMaterial' || Boolean(mat.userData?.gltfExtensions?.KHR_materials_unlit);
  if (metalize || unlit) {
    // Keep authored colormap/PBR maps. Never wash a kit piece into a flat accent slab.
    const color = std.color ? std.color.clone() : new THREE.Color('#ffffff');
    applyGrade(color, grade, tint, Boolean(map));
    const next = new THREE.MeshStandardMaterial({
      map,
      color,
      metalness: map ? 0.62 : 0.78,
      roughness: map ? 0.46 : 0.34,
      envMapIntensity: 0.55,
      emissive: std.emissive?.clone?.() ?? new THREE.Color('#000000'),
      emissiveMap: std.emissiveMap ?? null,
      emissiveIntensity: std.emissiveIntensity ?? 0,
      transparent: mat.transparent,
      opacity: mat.opacity,
      side: mat.side,
    });
    next.name = mat.name;
    return next;
  }
  if (std.isMeshStandardMaterial) {
    const next = std.clone();
    next.envMapIntensity = 0.55;
    next.roughness = Math.max(next.roughness ?? 0.4, 0.36);
    applyGrade(next.color, grade, tint, Boolean(next.map));
    return next;
  }
  return mat;
}

export function KitModel({ name, metalize = false, tint, grade, sit = true, ...props }: KitModelProps) {
  const url = kitUrl(name);
  const gltf = useGLTF(url);
  const scene = useMemo(() => {
    const cloned = SkeletonUtils.clone(gltf.scene) as THREE.Group;
    cloned.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const treated = mats.map((mat) => treatMaterial(mat, metalize, tint, grade));
      mesh.material = Array.isArray(mesh.material) ? treated : treated[0]!;
    });
    if (sit) {
      const box = new THREE.Box3().setFromObject(cloned);
      const center = box.getCenter(new THREE.Vector3());
      cloned.position.x -= center.x;
      cloned.position.z -= center.z;
      cloned.position.y -= box.min.y;
    }
    return cloned;
  }, [gltf.scene, grade, metalize, sit, tint]);

  return (
    <group {...props}>
      <primitive object={scene} />
    </group>
  );
}

export function preloadKit(name: KitName) {
  useGLTF.preload(kitUrl(name));
}

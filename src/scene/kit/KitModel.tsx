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
  sit?: boolean;
};

function treatMaterial(mat: THREE.Material, metalize: boolean, tint?: string): THREE.Material {
  const std = mat as THREE.MeshStandardMaterial;
  const map = 'map' in std ? std.map : null;
  const unlit = mat.type === 'MeshBasicMaterial' || Boolean(mat.userData?.gltfExtensions?.KHR_materials_unlit);
  if (metalize || unlit) {
    const color = std.color ? std.color.clone() : new THREE.Color('#c5cad2');
    if (tint) color.multiply(new THREE.Color(tint));
    else color.multiplyScalar(0.72);
    const next = new THREE.MeshStandardMaterial({
      map,
      color,
      metalness: 0.78,
      roughness: 0.28,
      envMapIntensity: 1.22,
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
    next.envMapIntensity = Math.max(next.envMapIntensity ?? 1, 1.18);
    if (tint) next.color.multiply(new THREE.Color(tint));
    return next;
  }
  return mat;
}

export function KitModel({ name, metalize = false, tint, sit = true, ...props }: KitModelProps) {
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
      const treated = mats.map((mat) => treatMaterial(mat, metalize, tint));
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
  }, [gltf.scene, metalize, sit, tint]);

  return (
    <group {...props}>
      <primitive object={scene} />
    </group>
  );
}

export function preloadKit(name: KitName) {
  useGLTF.preload(kitUrl(name));
}

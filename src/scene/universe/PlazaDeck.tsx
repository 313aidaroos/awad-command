'use client';

import { useMemo } from 'react';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { BrushedMetal } from '@/scene/materials/BrushedMetal';

const INSETS = Array.from({ length: 28 }, (_, i) => (i / 28) * Math.PI * 2);

function MetalRing() {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 9.15, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, 3.45, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.2,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.05,
      bevelThickness: 0.04,
      curveSegments: 80,
    });
    geo.rotateX(-Math.PI / 2);
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh geometry={geometry} receiveShadow castShadow>
      <BrushedMetal color="#8A909A" roughness={0.33} />
    </mesh>
  );
}

/** Raised brushed-metal annulus with inset lights. Ships sit on the ring. */
export function PlazaDeck() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
        <circleGeometry args={[24, 64]} />
        <meshStandardMaterial color="#07080A" metalness={0.2} roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <cylinderGeometry args={[3.42, 3.42, 0.08, 48]} />
        <BrushedMetal color="#5C6168" roughness={0.4} />
      </mesh>
      <MetalRing />
      {INSETS.map((a) => (
        <mesh key={`in-${a}`} position={[Math.sin(a) * 8.35, 0.21, Math.cos(a) * 8.35]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.055, 12]} />
          <meshStandardMaterial color="#C9D0DA" emissive="#C9D0DA" emissiveIntensity={0.7} toneMapped={false} />
        </mesh>
      ))}
      {INSETS.filter((_, i) => i % 2 === 0).map((a) => (
        <mesh key={`in2-${a}`} position={[Math.sin(a) * 4.05, 0.21, Math.cos(a) * 4.05]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.045, 12]} />
          <meshStandardMaterial color="#3D8BFF" emissive="#3D8BFF" emissiveIntensity={0.55} toneMapped={false} />
        </mesh>
      ))}
      <ContactShadows position={[0, 0.01, 0]} opacity={0.5} scale={28} blur={2.4} far={6} color="#000000" />
    </group>
  );
}

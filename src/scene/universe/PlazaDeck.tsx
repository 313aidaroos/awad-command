'use client';

import { useMemo } from 'react';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { BrushedMetal } from '@/scene/materials/BrushedMetal';

const INSETS = Array.from({ length: 32 }, (_, i) => (i / 32) * Math.PI * 2);

function MetalRing() {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 9.2, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, 3.7, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.36,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.06,
      bevelThickness: 0.05,
      curveSegments: 80,
    });
    geo.rotateX(-Math.PI / 2);
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh geometry={geometry} receiveShadow castShadow>
      <BrushedMetal color="#B4B8C0" roughness={0.28} />
    </mesh>
  );
}

/** Raised silver annulus over a dark well. Inset lights on the rim. */
export function PlazaDeck() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]} receiveShadow>
        <circleGeometry args={[26, 64]} />
        <meshStandardMaterial color="#07080A" metalness={0.15} roughness={0.94} />
      </mesh>
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <cylinderGeometry args={[3.68, 3.68, 0.06, 48]} />
        <meshPhysicalMaterial color="#12151A" metalness={0.7} roughness={0.55} envMapIntensity={0.25} />
      </mesh>
      <MetalRing />
      <mesh position={[0, 0.38, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[9.05, 9.28, 80]} />
        <BrushedMetal color="#D0D4DA" roughness={0.2} />
      </mesh>
      {INSETS.map((a) => (
        <mesh key={`out-${a}`} position={[Math.sin(a) * 8.45, 0.4, Math.cos(a) * 8.45]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.09, 14]} />
          <meshStandardMaterial color="#E6E8EC" emissive="#E6E8EC" emissiveIntensity={0.85} toneMapped={false} />
        </mesh>
      ))}
      {INSETS.filter((_, i) => i % 2 === 0).map((a) => (
        <mesh key={`in-${a}`} position={[Math.sin(a) * 4.15, 0.4, Math.cos(a) * 4.15]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.075, 14]} />
          <meshStandardMaterial color="#3D8BFF" emissive="#3D8BFF" emissiveIntensity={0.7} toneMapped={false} />
        </mesh>
      ))}
      <ContactShadows position={[0, 0.01, 0]} opacity={0.48} scale={28} blur={2.3} far={6} color="#000000" />
    </group>
  );
}

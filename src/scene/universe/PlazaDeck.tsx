'use client';

import { useMemo } from 'react';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { KitBrushed } from '@/scene/materials/KitBrushed';

const INSETS = Array.from({ length: 32 }, (_, i) => (i / 32) * Math.PI * 2);

function MetalRing() {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 9.35, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, 5.05, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.4,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.07,
      bevelThickness: 0.055,
      curveSegments: 80,
    });
    geo.rotateX(-Math.PI / 2);
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh geometry={geometry} receiveShadow castShadow>
      <KitBrushed repeat={[8, 1.4]} grade="#D0D4DA" roughness={0.3} />
    </mesh>
  );
}

/** Raised PBR metal annulus over a dark well. Lights on both rims. */
export function PlazaDeck() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14, 0]} receiveShadow>
        <circleGeometry args={[26, 64]} />
        <meshStandardMaterial color="#07080A" metalness={0.12} roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.04, 0]} receiveShadow>
        <cylinderGeometry args={[5.02, 5.02, 0.06, 56]} />
        <meshPhysicalMaterial color="#0C0E12" metalness={0.55} roughness={0.62} envMapIntensity={0.2} />
      </mesh>
      <MetalRing />
      <mesh position={[0, 0.42, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[9.18, 9.42, 80]} />
        <KitBrushed repeat={[10, 0.4]} grade="#E6E8EC" roughness={0.24} />
      </mesh>
      {INSETS.map((a) => (
        <mesh key={`out-${a}`} position={[Math.sin(a) * 8.55, 0.44, Math.cos(a) * 8.55]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.1, 14]} />
          <meshStandardMaterial color="#E6E8EC" emissive="#E6E8EC" emissiveIntensity={0.9} toneMapped={false} />
        </mesh>
      ))}
      {INSETS.filter((_, i) => i % 2 === 0).map((a) => (
        <mesh key={`in-${a}`} position={[Math.sin(a) * 5.35, 0.44, Math.cos(a) * 5.35]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.085, 14]} />
          <meshStandardMaterial color="#3D8BFF" emissive="#3D8BFF" emissiveIntensity={0.75} toneMapped={false} />
        </mesh>
      ))}
      <ContactShadows position={[0, 0.01, 0]} opacity={0.5} scale={28} blur={2.2} far={6} color="#000000" />
    </group>
  );
}

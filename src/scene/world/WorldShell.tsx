'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCommandStore } from '@/store/useCommandStore';

export function WorldShell({ accent }: { accent: string }) {
  const mesh = useRef<THREE.Mesh>(null);
  const enterPhase = useCommandStore((s) => s.enterPhase);
  const opacity = useRef(0);

  useFrame((_, dt) => {
    if (!mesh.current) return;
    const mat = mesh.current.material as THREE.MeshBasicMaterial;
    const target = enterPhase === 'shell' ? 0.28 : enterPhase === 'interior' ? 0.07 : 0;
    opacity.current += (target - opacity.current) * Math.min(1, dt * 2.2);
    mat.opacity = opacity.current;
    mesh.current.visible = opacity.current > 0.01;
    mesh.current.rotation.y += dt * 0.03;
  });

  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[11.4, 48, 32]} />
      <meshBasicMaterial color={accent} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

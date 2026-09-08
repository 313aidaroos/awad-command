'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DoubleSide } from 'three';
import { particleCount } from '@/lib/quality';
import { useCommandStore } from '@/store/useCommandStore';

export function Atmosphere() {
  const quality = useCommandStore((s) => s.quality.level);
  const dust = useRef<THREE.Points>(null);

  const geo = useMemo(() => {
    const n = particleCount(quality, 900, 480, 180);
    const positions = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 1) {
      const th = Math.random() * Math.PI * 2;
      const rr = 6 + Math.pow(Math.random(), 0.7) * 38;
      positions.set([Math.cos(th) * rr, (Math.random() - 0.5) * 5.5, Math.sin(th) * rr], i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [quality]);

  useFrame((_, dt) => {
    if (dust.current) dust.current.rotation.y += dt * 0.002;
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -14.5, 0]}>
        <ringGeometry args={[16, 48, 96]} />
        <meshBasicMaterial color="#1a1f28" transparent opacity={0.22} side={DoubleSide} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -14.4, 0]}>
        <ringGeometry args={[22, 23.2, 96]} />
        <meshBasicMaterial color="#E6E8EC" transparent opacity={0.06} side={DoubleSide} depthWrite={false} />
      </mesh>
      <points ref={dust} geometry={geo}>
        <pointsMaterial color="#9aa6b8" size={0.045} transparent opacity={0.18} depthWrite={false} sizeAttenuation />
      </points>
    </group>
  );
}

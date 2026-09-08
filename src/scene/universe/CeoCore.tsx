'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { particleCount } from '@/lib/quality';
import { OrbCore } from '@/scene/universe/OrbCore';
import { useCommandStore } from '@/store/useCommandStore';

export function CeoCore() {
  const spin = useRef<THREE.Group>(null);
  const pulse = useRef<THREE.Mesh>(null);
  const focused = useCommandStore((s) => s.focusedProject);
  const quality = useCommandStore((s) => s.quality.level);
  const flyTo = useCommandStore((s) => s.flyTo);
  const openPanel = useCommandStore((s) => s.openPanel);

  const halo = useMemo(() => {
    const n = particleCount(quality, 260, 160, 90);
    const positions = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 1) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const rr = 1.15 + Math.random() * 0.85;
      positions.set(
        [rr * Math.sin(ph) * Math.cos(th), rr * Math.sin(ph) * Math.sin(th) * 0.72, rr * Math.cos(ph)],
        i * 3,
      );
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [quality]);

  useFrame((state, dt) => {
    if (spin.current) {
      spin.current.rotation.y += dt * 0.12;
      spin.current.rotation.x += dt * 0.045;
    }
    if (pulse.current) {
      const s = 1.05 + Math.sin(state.clock.elapsedTime * 0.7) * 0.035;
      pulse.current.scale.setScalar(s);
    }
  });

  if (focused) return null;

  return (
    <group>
      <OrbCore
        accent="#dfe4ee"
        status="operational"
        activity={0.62}
        hovered={false}
        radius={1.05}
        onClick={() => {
          flyTo({ position: [0, 3.2, 11], lookAt: [0, 0, 0], duration: 1.2, phase: 'universe' });
          openPanel('none');
        }}
      />
      <group ref={spin}>
        <mesh>
          <icosahedronGeometry args={[1.55, 1]} />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.12} />
        </mesh>
        <mesh>
          <octahedronGeometry args={[0.62, 0]} />
          <meshStandardMaterial
            color="#E6E8EC"
            metalness={0.5}
            roughness={0.28}
            transparent
            opacity={0.55}
            emissive="#3D8BFF"
            emissiveIntensity={0.18}
          />
        </mesh>
      </group>
      <mesh ref={pulse} rotation={[1.2, 0.2, 0.1]}>
        <torusGeometry args={[2.05, 0.012, 8, 80]} />
        <meshBasicMaterial color="#3D8BFF" transparent opacity={0.28} />
      </mesh>
      <mesh rotation={[0.4, 0.8, 1.1]}>
        <torusGeometry args={[2.45, 0.008, 8, 80]} />
        <meshBasicMaterial color="#9aa3b2" transparent opacity={0.16} />
      </mesh>
      <mesh rotation={[1.7, 0.3, 0]}>
        <torusGeometry args={[2.85, 0.007, 8, 72]} />
        <meshBasicMaterial color="#dfe4ee" transparent opacity={0.1} />
      </mesh>
      <points geometry={halo}>
        <pointsMaterial color="#dfe4ee" size={0.032} transparent opacity={0.55} depthWrite={false} sizeAttenuation />
      </points>
      <Html center distanceFactor={14} position={[0, 2.15, 0]} style={{ pointerEvents: 'none' }}>
        <div className="text-center whitespace-nowrap">
          <div className="text-[12px] tracking-[0.28em] font-light text-[rgba(230,232,236,0.92)]">AWAD</div>
          <div className="font-num text-[9.5px] text-[var(--muted)] mt-0.5">CEO · command core</div>
        </div>
      </Html>
    </group>
  );
}

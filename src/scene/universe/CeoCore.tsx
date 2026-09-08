'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { requestCeoOpen } from '@/lib/ceoBridge';
import { particleCount } from '@/lib/quality';
import { AccentGlow } from '@/scene/materials/AccentGlow';
import { ChassisMaterial } from '@/scene/materials/ChassisMaterial';
import { SilverMaterial } from '@/scene/materials/SilverMaterial';
import { HitSphere } from '@/scene/universe/HitSphere';
import { pointerGate } from '@/scene/lib/pointer';
import { FloatingLabel } from '@/scene/ui/FloatingLabel';
import { WorldName } from '@/scene/ui/WorldName';
import { useCommandStore } from '@/store/useCommandStore';

export function CeoCore() {
  const inner = useRef<THREE.Group>(null);
  const rings = useRef<THREE.Group>(null);
  const quality = useCommandStore((s) => s.quality.level);
  const flyTo = useCommandStore((s) => s.flyTo);
  const detail = quality !== 'low';

  const disc = useMemo(() => {
    const n = particleCount(quality, 420, 240, 110);
    const positions = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 1) {
      const th = Math.random() * Math.PI * 2;
      const rr = 1.15 + Math.pow(Math.random(), 0.55) * 1.85;
      const y = (Math.random() - 0.5) * 0.12;
      positions.set([Math.cos(th) * rr, y, Math.sin(th) * rr], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [quality]);

  useFrame((_, dt) => {
    if (inner.current) inner.current.rotation.y += dt * 0.035;
    if (rings.current) rings.current.rotation.y -= dt * 0.018;
  });

  const openCeo = () => {
    if (pointerGate.suppressClick) return;
    flyTo({ position: [0, 3.2, 11], lookAt: [0, 0.2, 0], duration: 1.2, phase: 'universe' });
    requestCeoOpen();
  };

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        openCeo();
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'grab';
      }}
    >
      <HitSphere radius={1.7} />
      <mesh>
        <sphereGeometry args={[0.92, 48, 36]} />
        <ChassisMaterial roughness={0.36} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.08, 12, 10]} />
        <AccentGlow accent="#E6E8EC" opacity={0.55} />
      </mesh>
      <group ref={inner}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.94, 0.022, 8, 64]} />
          <SilverMaterial roughness={0.22} />
        </mesh>
      </group>
      <group ref={rings}>
        <mesh rotation={[1.22, 0.18, 0.08]}>
          <torusGeometry args={[1.92, 0.016, 8, 96]} />
          <SilverMaterial roughness={0.14} />
        </mesh>
        <mesh rotation={[0.42, 0.9, 1.05]}>
          <torusGeometry args={[2.28, 0.009, 8, 80]} />
          <meshBasicMaterial color="#C9D0DA" transparent opacity={0.42} />
        </mesh>
        <mesh rotation={[1.68, 0.22, 0.12]}>
          <torusGeometry args={[2.68, 0.007, 8, 72]} />
          <meshBasicMaterial color="#E6E8EC" transparent opacity={0.22} />
        </mesh>
        {detail
          ? Array.from({ length: 24 }, (_, i) => {
              const a = (i / 24) * Math.PI * 2;
              return (
                <mesh key={i} position={[Math.cos(a) * 1.92, Math.sin(a) * 0.22, Math.sin(a) * 1.92]} rotation={[1.22, 0, a]}>
                  <boxGeometry args={[0.012, 0.05, 0.012]} />
                  <SilverMaterial />
                </mesh>
              );
            })
          : null}
      </group>
      <points geometry={disc} rotation={[0.12, 0, 0.08]}>
        <pointsMaterial color="#dfe4ee" size={0.026} transparent opacity={0.42} depthWrite={false} sizeAttenuation />
      </points>
      <FloatingLabel id="ceo-core" priority={4} maxDist={62} fadeFrom={38} position={[0, 2.25, 0]}>
        <WorldName primary>AWAD</WorldName>
      </FloatingLabel>
    </group>
  );
}

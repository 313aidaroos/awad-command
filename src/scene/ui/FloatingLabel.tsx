'use client';

import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { distanceFade, submitLabel } from '@/scene/lib/labelBudget';

const _world = new THREE.Vector3();
const _ndc = new THREE.Vector3();

export function FloatingLabel({
  id,
  priority,
  maxDist,
  fadeFrom,
  children,
  position = [0, 0, 0],
}: {
  id: string;
  priority: number;
  maxDist: number;
  fadeFrom: number;
  children: ReactNode;
  position?: [number, number, number];
}) {
  const group = useRef<THREE.Group>(null);
  const el = useRef<HTMLDivElement>(null);

  useFrame(({ camera }) => {
    if (!group.current) return;
    group.current.getWorldPosition(_world);
    _ndc.copy(_world).project(camera);
    const dist = camera.position.distanceTo(_world);
    submitLabel({
      id,
      x: _ndc.x,
      y: _ndc.y,
      z: _ndc.z,
      dist,
      priority,
      fade: distanceFade(dist, fadeFrom, maxDist),
      el: el.current,
    });
  });

  return (
    <group ref={group} position={position}>
      <Html center transform={false} style={{ pointerEvents: 'none' }}>
        <div
          ref={el}
          style={{
            opacity: 0,
            visibility: 'hidden',
            transition: 'opacity 160ms linear',
            whiteSpace: 'nowrap',
          }}
        >
          {children}
        </div>
      </Html>
    </group>
  );
}

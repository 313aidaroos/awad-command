'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { projects } from '@/projects/registry';
import { useCommandStore } from '@/store/useCommandStore';

export function ConnectionTraffic() {
  const focused = useCommandStore((s) => s.focusedProject);
  const curves = useMemo(() => {
    return projects.map((project) => {
      const a = new THREE.Vector3(...project.universePosition);
      return {
        accent: project.accent,
        curve: new THREE.QuadraticBezierCurve3(a, a.clone().multiplyScalar(0.4), new THREE.Vector3()),
        phase: Math.abs(project.universePosition[0]) * 0.05,
      };
    });
  }, []);

  if (focused) return null;
  return (
    <group>
      {curves.map((item) => (
        <Pulse key={item.accent + item.phase} curve={item.curve} color={item.accent} phase={item.phase} />
      ))}
    </group>
  );
}

function Pulse({
  curve,
  color,
  phase,
}: {
  curve: THREE.QuadraticBezierCurve3;
  color: string;
  phase: number;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!mesh.current) return;
    const u = (state.clock.elapsedTime * 0.08 + phase) % 1;
    const p = curve.getPointAt(u);
    mesh.current.position.copy(p);
  });
  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[0.055, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.7} />
    </mesh>
  );
}

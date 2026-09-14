'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { projects } from '@/projects/registry';

export function ConnectionTraffic() {
  const curves = useMemo(() => {
    const bySlug = Object.fromEntries(projects.map((p) => [p.slug, p]));
    const seen = new Set<string>();
    const result: { key: string; accent: string; curve: THREE.QuadraticBezierCurve3; phase: number }[] = [];
    for (const project of projects) {
      const a = new THREE.Vector3(...project.universePosition);
      for (const link of project.connections) {
        const pair = [project.slug, link.to].sort().join(':');
        if (seen.has(pair)) continue;
        seen.add(pair);
        const other = bySlug[link.to];
        if (!other) continue;
        const b = new THREE.Vector3(...other.universePosition);
        const mid = a.clone().add(b).multiplyScalar(0.5);
        mid.y += 1.6;
        result.push({
          key: pair,
          accent: project.accent,
          curve: new THREE.QuadraticBezierCurve3(a, mid, b),
          phase: Math.abs(project.universePosition[0]) * 0.04,
        });
      }
    }
    return result;
  }, []);

  return (
    <group>
      {curves.map((item) => (
        <Pulse key={item.key} curve={item.curve} color={item.accent} phase={item.phase} />
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
    const u = (state.clock.elapsedTime * 0.05 + phase) % 1;
    const p = curve.getPointAt(u);
    mesh.current.position.copy(p);
  });
  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.7} toneMapped={false} />
    </mesh>
  );
}

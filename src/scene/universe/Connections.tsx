'use client';

import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { projects } from '@/projects/registry';

/** Only declared project links — no hairline spokes from every world to the CEO. */
export function Connections() {
  const lines = useMemo(() => {
    const result: { points: THREE.Vector3[]; key: string }[] = [];
    const bySlug = Object.fromEntries(projects.map((p) => [p.slug, p]));
    const seen = new Set<string>();
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
          points: new THREE.QuadraticBezierCurve3(a, mid, b).getPoints(24),
        });
      }
    }
    return result;
  }, []);

  return (
    <group>
      {lines.map((line) => (
        <Line
          key={line.key}
          points={line.points}
          color="#C5CCD6"
          transparent
          opacity={0.28}
          lineWidth={1.8}
          depthWrite={false}
        />
      ))}
    </group>
  );
}

'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { projects } from '@/projects/registry';
import { useCommandStore } from '@/store/useCommandStore';

export function Connections() {
  const focused = useCommandStore((s) => s.focusedProject);
  const lines = useMemo(() => {
    const result: { positions: Float32Array; color: string }[] = [];
    const bySlug = Object.fromEntries(projects.map((p) => [p.slug, p]));
    const toPositions = (points: THREE.Vector3[]) => {
      const positions = new Float32Array(points.length * 3);
      for (let i = 0; i < points.length; i += 1) {
        positions[i * 3] = points[i].x;
        positions[i * 3 + 1] = points[i].y;
        positions[i * 3 + 2] = points[i].z;
      }
      return positions;
    };
    for (const project of projects) {
      const a = new THREE.Vector3(...project.universePosition);
      result.push({
        positions: toPositions(
          new THREE.QuadraticBezierCurve3(
            a,
            a.clone().multiplyScalar(0.4),
            new THREE.Vector3(),
          ).getPoints(24),
        ),
        color: '#8fa4c9',
      });
      for (const link of project.connections) {
        const other = bySlug[link.to];
        if (!other) continue;
        const b = new THREE.Vector3(...other.universePosition);
        const mid = a.clone().add(b).multiplyScalar(0.5).multiplyScalar(0.82);
        result.push({
          positions: toPositions(new THREE.QuadraticBezierCurve3(a, mid, b).getPoints(28)),
          color: project.accent,
        });
      }
    }
    return result;
  }, []);

  if (focused) return null;

  return (
    <group>
      {lines.map((line, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[line.positions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color={line.color} transparent opacity={i % 2 === 0 ? 0.05 : 0.14} />
        </line>
      ))}
    </group>
  );
}

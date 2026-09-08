'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import type { Flow } from '@/types/world';
import type { ProjectDefinition } from '@/types/project';

export function FlowPath({ project, flow }: { project: ProjectDefinition; flow: Flow }) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (const stage of flow.stages) {
      const agent = project.agents.find((a) => a.id === stage.atAgentId);
      const node = project.nodes.find((n) => n.id === stage.atNodeId);
      const pos = agent?.homePosition ?? node?.position;
      if (pos) pts.push(new THREE.Vector3(...pos));
    }
    if (pts.length < 2) return [];
    return new THREE.CatmullRomCurve3(pts).getPoints(32);
  }, [flow, project]);

  if (points.length < 2) return null;

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(points.flatMap((p) => [p.x, p.y, p.z])), 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial color={project.accent} transparent opacity={0.18} />
    </line>
  );
}

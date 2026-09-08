'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { geoSegments } from '@/lib/quality';
import { useCommandStore } from '@/store/useCommandStore';
import type { Flow } from '@/types/world';
import type { ProjectDefinition } from '@/types/project';

function stagePoint(project: ProjectDefinition, stage: Flow['stages'][number]) {
  const node = project.nodes.find((item) => item.id === stage.atNodeId);
  const agent = project.agents.find((item) => item.id === stage.atAgentId);
  const pos = node?.position ?? agent?.homePosition;
  return pos ? new THREE.Vector3(...pos) : null;
}

export function flowCurve(project: ProjectDefinition, flow: Flow): THREE.CatmullRomCurve3 | null {
  const pts = flow.stages.map((stage) => stagePoint(project, stage)).filter((p): p is THREE.Vector3 => Boolean(p));
  if (pts.length < 2) return null;
  return new THREE.CatmullRomCurve3(pts);
}

export function FlowPath({ project, flow }: { project: ProjectDefinition; flow: Flow }) {
  const quality = useCommandStore((s) => s.quality.level);
  const curve = useMemo(() => flowCurve(project, flow), [flow, project]);
  const tubular = geoSegments(quality, 56, 36, 18);
  if (!curve) return null;

  return (
    <mesh>
      <tubeGeometry args={[curve, tubular, quality === 'low' ? 0.018 : 0.026, 5, false]} />
      <meshStandardMaterial color={project.accent} transparent opacity={0.2} metalness={0.2} roughness={0.55} />
    </mesh>
  );
}

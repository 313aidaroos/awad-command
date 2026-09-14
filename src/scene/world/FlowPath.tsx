'use client';

import * as THREE from 'three';
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

export function FlowPath() {
  return null;
}

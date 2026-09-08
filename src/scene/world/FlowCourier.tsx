'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { flowCurve } from '@/scene/world/FlowPath';
import { useCommandStore } from '@/store/useCommandStore';
import type { ProjectDefinition } from '@/types/project';

export function FlowCouriers({ project }: { project: ProjectDefinition }) {
  const flows = useCommandStore((s) => s.flows);
  const instances = Object.values(flows).filter((item) => item.projectSlug === project.slug);
  if (instances.length === 0) return null;
  return (
    <group>
      {instances.map((item) => {
        const flow = project.flows.find((def) => def.id === item.flowId);
        if (!flow) return null;
        return <Courier key={item.flowId + item.startedAt} project={project} flowId={item.flowId} stageIndex={item.stageIndex} started={item.stageStartedAt} />;
      })}
    </group>
  );
}

function Courier({
  project,
  flowId,
  stageIndex,
  started,
}: {
  project: ProjectDefinition;
  flowId: string;
  stageIndex: number;
  started: number;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const flow = project.flows.find((item) => item.id === flowId);
  const curve = useMemo(() => (flow ? flowCurve(project, flow) : null), [flow, project]);

  useFrame(() => {
    if (!mesh.current || !curve || !flow) return;
    const stage = flow.stages[Math.min(stageIndex, flow.stages.length - 1)];
    const local = Math.min(1, Math.max(0, (Date.now() - started) / (stage?.durationMs ?? 2400)));
    const u = Math.min(0.999, (stageIndex + local) / Math.max(1, flow.stages.length));
    const p = curve.getPointAt(u);
    mesh.current.position.copy(p);
  });

  if (!curve) return null;
  return (
    <mesh ref={mesh}>
      <boxGeometry args={[0.1, 0.1, 0.1]} />
      <meshStandardMaterial
        color={project.accent}
        emissive={project.accent}
        emissiveIntensity={0.35}
        metalness={0.55}
        roughness={0.28}
      />
    </mesh>
  );
}

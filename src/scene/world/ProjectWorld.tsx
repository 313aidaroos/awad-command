'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getProject } from '@/projects/registry';
import { AgentEntity } from '@/scene/world/AgentEntity';
import { FlowCouriers } from '@/scene/world/FlowCourier';
import { FlowPath } from '@/scene/world/FlowPath';
import { WorldCore } from '@/scene/world/WorldCore';
import { WorldNodeMesh } from '@/scene/world/WorldNodeMesh';
import { WorldHorizon } from '@/scene/world/WorldHorizon';
import { WorldShell } from '@/scene/world/WorldShell';
import { useCommandStore } from '@/store/useCommandStore';

export function ProjectWorld() {
  const group = useRef<THREE.Group>(null);
  const slug = useCommandStore((s) => s.focusedProject);
  const enterPhase = useCommandStore((s) => s.enterPhase);
  const project = slug ? getProject(slug) : undefined;

  useFrame((_, dt) => {
    if (!group.current) return;
    const target = enterPhase === 'interior' || enterPhase === 'shell' ? 1 : 0.001;
    const current = group.current.scale.x;
    const next = current + (target - current) * Math.min(1, dt * 2.2);
    group.current.scale.setScalar(next);
    group.current.visible = next > 0.05;
  });

  if (!project) return null;

  return (
    <group position={project.universePosition}>
      <WorldShell accent={project.accent} />
      <pointLight color={project.accent} intensity={1.35} distance={22} position={[0, 1.2, 0]} />
      <pointLight color="#e8ecf4" intensity={0.55} distance={18} position={[4, 3, 5]} />
      <group ref={group} scale={0.001} visible={false}>
        <WorldHorizon accent={project.accent} />
        <WorldCore project={project} />
        {project.agents.map((agent) => (
          <AgentEntity key={agent.id} agent={agent} nodes={project.nodes} />
        ))}
        {project.nodes.map((node) => (
          <WorldNodeMesh key={node.id} node={node} accent={project.accent} />
        ))}
        {project.flows.map((flow) => (
          <FlowPath key={flow.id} project={project} flow={flow} />
        ))}
        <FlowCouriers project={project} />
      </group>
    </group>
  );
}

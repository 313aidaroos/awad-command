'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getProject } from '@/projects/registry';
import { showExterior } from '@/scene/lib/cameraPaths';
import { AgentEntity } from '@/scene/world/AgentEntity';
import { ContraxisFacility } from '@/scene/world/ContraxisFacility';
import { FlowCouriers } from '@/scene/world/FlowCourier';
import { FlowPath } from '@/scene/world/FlowPath';
import { GenericChamber } from '@/scene/world/GenericChamber';
import { WorldNodeMesh } from '@/scene/world/WorldNodeMesh';
import { useCommandStore } from '@/store/useCommandStore';

export function ProjectWorld() {
  const group = useRef<THREE.Group>(null);
  const slug = useCommandStore((s) => s.focusedProject);
  const enterPhase = useCommandStore((s) => s.enterPhase);
  const project = slug ? getProject(slug) : undefined;
  const interior = !showExterior(enterPhase);

  useFrame((_, dt) => {
    if (!group.current) return;
    const target = interior ? 1 : 0.001;
    const current = group.current.scale.x;
    const next = current + (target - current) * Math.min(1, dt * 3.2);
    group.current.scale.setScalar(next);
    group.current.visible = next > 0.05;
  });

  if (!project || !interior) return null;
  const contraxis = project.slug === 'contraxis';

  return (
    <group position={project.universePosition}>
      <group ref={group} scale={0.001} visible={false}>
        {contraxis ? <ContraxisFacility accent={project.accent} /> : <GenericChamber accent={project.accent} />}
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

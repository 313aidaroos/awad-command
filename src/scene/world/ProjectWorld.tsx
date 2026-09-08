'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getProject } from '@/projects/registry';
import { AgentEntity } from '@/scene/world/AgentEntity';
import { ContraxisInterior } from '@/scene/world/ContraxisInterior';
import { WorldChamber } from '@/scene/world/WorldChamber';
import { WorldHorizon } from '@/scene/world/WorldHorizon';
import { WorldNodeMesh } from '@/scene/world/WorldNodeMesh';
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
    const next = current + (target - current) * Math.min(1, dt * 3.2);
    group.current.scale.setScalar(next);
    group.current.visible = next > 0.05;
  });

  if (!project) return null;

  return (
    <group position={project.universePosition}>
      <group ref={group} scale={0.001} visible={false}>
        <WorldChamber />
        <WorldHorizon />
        {project.slug === 'contraxis' ? <ContraxisInterior /> : null}
        {project.agents.map((agent) => (
          <AgentEntity key={agent.id} agent={agent} nodes={project.nodes} />
        ))}
        {project.nodes.map((node) => (
          <WorldNodeMesh key={node.id} node={node} accent={project.accent} />
        ))}
      </group>
    </group>
  );
}

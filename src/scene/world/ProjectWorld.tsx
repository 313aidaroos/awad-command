'use client';

import { getProject } from '@/projects/registry';
import { AgentEntity } from '@/scene/world/AgentEntity';
import { FlowPath } from '@/scene/world/FlowPath';
import { WorldCore } from '@/scene/world/WorldCore';
import { WorldNodeMesh } from '@/scene/world/WorldNodeMesh';
import { useCommandStore } from '@/store/useCommandStore';

export function ProjectWorld() {
  const slug = useCommandStore((s) => s.focusedProject);
  const project = slug ? getProject(slug) : undefined;
  if (!project) return null;
  return (
    <group position={project.universePosition}>
      <WorldCore project={project} />
      {project.agents.map((agent) => (
        <AgentEntity key={agent.id} agent={agent} />
      ))}
      {project.nodes.map((node) => (
        <WorldNodeMesh key={node.id} node={node} />
      ))}
      {project.flows.map((flow) => (
        <FlowPath key={flow.id} project={project} flow={flow} />
      ))}
    </group>
  );
}

'use client';

import { getProject } from '@/projects/registry';
import { showExterior } from '@/scene/lib/cameraPaths';
import { AgentEntity } from '@/scene/world/AgentEntity';
import { ContraxisFacility } from '@/scene/world/ContraxisFacility';
import { FlowCouriers } from '@/scene/world/FlowCourier';
import { FlowPath } from '@/scene/world/FlowPath';
import { GenericChamber } from '@/scene/world/GenericChamber';
import { WorldNodeMesh } from '@/scene/world/WorldNodeMesh';
import { useCommandStore } from '@/store/useCommandStore';

/** Sealed interiors mount at the origin at full scale — never fade in from 0.001. */
export function ProjectWorld() {
  const slug = useCommandStore((s) => s.focusedProject);
  const enterPhase = useCommandStore((s) => s.enterPhase);
  const project = slug ? getProject(slug) : undefined;
  const interior = !showExterior(enterPhase) || slug === 'contraxis';

  if (!project || !interior) return null;
  const contraxis = project.slug === 'contraxis';

  return (
    <group>
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
  );
}

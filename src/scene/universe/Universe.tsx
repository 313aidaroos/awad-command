'use client';

import { projects } from '@/projects/registry';
import { showExterior } from '@/scene/lib/cameraPaths';
import { CeoCore } from '@/scene/universe/CeoCore';
import { CommandDeck } from '@/scene/universe/CommandDeck';
import { ConnectionTraffic } from '@/scene/universe/ConnectionTraffic';
import { Connections } from '@/scene/universe/Connections';
import { ProjectOrb } from '@/scene/universe/ProjectOrb';
import { useCommandStore } from '@/store/useCommandStore';

export function Universe() {
  const enterPhase = useCommandStore((s) => s.enterPhase);
  if (!showExterior(enterPhase)) return null;
  return (
    <group>
      <CommandDeck />
      <CeoCore />
      <Connections />
      <ConnectionTraffic />
      {projects.map((project) => (
        <ProjectOrb key={project.slug} project={project} />
      ))}
    </group>
  );
}

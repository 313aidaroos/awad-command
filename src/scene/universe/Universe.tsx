'use client';

import { projects } from '@/projects/registry';
import { showExterior } from '@/scene/lib/cameraPaths';
import { CeoCore } from '@/scene/universe/CeoCore';
import { CommandDeck } from '@/scene/universe/CommandDeck';
import { ProjectOrb } from '@/scene/universe/ProjectOrb';
import { useCommandStore } from '@/store/useCommandStore';

export function Universe() {
  const enterPhase = useCommandStore((s) => s.enterPhase);
  if (!showExterior(enterPhase)) return null;
  return (
    <group>
      <CommandDeck />
      <CeoCore />
      {projects.map((project) => (
        <ProjectOrb key={project.slug} project={project} />
      ))}
    </group>
  );
}

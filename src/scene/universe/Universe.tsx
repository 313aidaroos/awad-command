'use client';

import { projects } from '@/projects/registry';
import { showExterior } from '@/scene/lib/cameraPaths';
import { CeoCore } from '@/scene/universe/CeoCore';
import { CompanyVessel } from '@/scene/universe/CompanyVessel';
import { PlazaDeck } from '@/scene/universe/PlazaDeck';
import { onPlaza } from '@/scene/universe/identities';
import { useCommandStore } from '@/store/useCommandStore';

export function Universe() {
  const enterPhase = useCommandStore((s) => s.enterPhase);
  const focused = useCommandStore((s) => s.focusedProject);
  if (!showExterior(enterPhase)) return null;
  return (
    <group>
      <PlazaDeck />
      <CeoCore />
      {projects
        .filter((project) => onPlaza(project.slug) || project.slug === focused)
        .map((project) => (
          <CompanyVessel key={project.slug} project={project} />
        ))}
    </group>
  );
}

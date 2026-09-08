'use client';

import { projects } from '@/projects/registry';
import { showExterior } from '@/scene/lib/cameraPaths';
import { CathedralDeck } from '@/scene/universe/CathedralDeck';
import { CeoCore } from '@/scene/universe/CeoCore';
import { CompanyStation } from '@/scene/universe/CompanyStation';
import { onPlaza } from '@/scene/universe/identities';
import { useCommandStore } from '@/store/useCommandStore';

export function Universe() {
  const enterPhase = useCommandStore((s) => s.enterPhase);
  const focused = useCommandStore((s) => s.focusedProject);
  if (!showExterior(enterPhase)) return null;
  return (
    <group>
      <CathedralDeck />
      <CeoCore />
      {projects
        .filter((project) => onPlaza(project.slug) || project.slug === focused)
        .map((project) => (
          <CompanyStation key={project.slug} project={project} />
        ))}
    </group>
  );
}

'use client';

import { projects } from '@/projects/registry';
import { showExterior } from '@/scene/lib/cameraPaths';
import { CathedralDeck } from '@/scene/universe/CathedralDeck';
import { CeoCore } from '@/scene/universe/CeoCore';
import { CompanyStation } from '@/scene/universe/CompanyStation';
import { StudioCyc } from '@/scene/universe/StudioCyc';
import { useCommandStore } from '@/store/useCommandStore';

export function Universe() {
  const enterPhase = useCommandStore((s) => s.enterPhase);
  if (!showExterior(enterPhase)) return null;
  return (
    <group>
      <StudioCyc />
      <CathedralDeck />
      <CeoCore />
      {projects.map((project) => (
        <CompanyStation key={project.slug} project={project} />
      ))}
    </group>
  );
}

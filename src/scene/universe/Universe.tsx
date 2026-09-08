'use client';

import { projects } from '@/projects/registry';
import { CeoCore } from '@/scene/universe/CeoCore';
import { Connections } from '@/scene/universe/Connections';
import { ProjectOrb } from '@/scene/universe/ProjectOrb';

export function Universe() {
  return (
    <group>
      <CeoCore />
      <Connections />
      {projects.map((project) => (
        <ProjectOrb key={project.slug} project={project} />
      ))}
    </group>
  );
}

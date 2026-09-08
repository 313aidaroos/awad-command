'use client';

import { projects } from '@/projects/registry';
import { CeoCore } from '@/scene/universe/CeoCore';
import { ConnectionTraffic } from '@/scene/universe/ConnectionTraffic';
import { Connections } from '@/scene/universe/Connections';
import { ProjectOrb } from '@/scene/universe/ProjectOrb';

export function Universe() {
  return (
    <group>
      <CeoCore />
      <Connections />
      <ConnectionTraffic />
      {projects.map((project) => (
        <ProjectOrb key={project.slug} project={project} />
      ))}
    </group>
  );
}

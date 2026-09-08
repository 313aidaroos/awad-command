'use client';

import { OrbCore } from '@/scene/universe/OrbCore';
import { useCommandStore } from '@/store/useCommandStore';
import type { ProjectDefinition } from '@/types/project';

export function WorldCore({ project }: { project: ProjectDefinition }) {
  const runtime = useCommandStore((s) => s.projects[project.slug]);
  return (
    <OrbCore
      accent={project.accent}
      status={runtime?.status ?? project.initialStatus}
      activity={runtime?.activity ?? 0.4}
      hovered={false}
      radius={3.2}
    />
  );
}

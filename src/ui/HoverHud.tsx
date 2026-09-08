'use client';

import { getProject } from '@/projects/registry';
import { useCommandStore } from '@/store/useCommandStore';

export function HoverHud() {
  const slug = useCommandStore((s) => s.hoveredProject);
  const view = useCommandStore((s) => s.view);
  const project = slug ? getProject(slug) : undefined;
  if (!slug || !project || view !== 'universe') return null;
  return (
    <div className="pointer-events-none fixed left-4 top-14 z-20 hidden md:block text-[11px] tracking-[0.2em] text-[rgba(230,232,236,0.88)]">
      {project.name}
    </div>
  );
}

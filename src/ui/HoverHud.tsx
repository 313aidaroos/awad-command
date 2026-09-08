'use client';

import { getProject } from '@/projects/registry';
import { useCommandStore } from '@/store/useCommandStore';

export function HoverHud() {
  const slug = useCommandStore((s) => s.hoveredProject);
  const view = useCommandStore((s) => s.view);
  const project = slug ? getProject(slug) : undefined;
  if (!slug || !project || view !== 'universe') return null;
  return (
    <div className="pointer-events-none fixed left-4 top-14 z-20 hidden md:block rounded-full border border-white/15 bg-[rgba(7,8,10,0.72)] px-3 py-1 text-[13px] tracking-[0.16em] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]">
      {project.name}
    </div>
  );
}

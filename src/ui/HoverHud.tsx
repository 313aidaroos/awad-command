'use client';

import { getProject } from '@/projects/registry';
import { useCommandStore } from '@/store/useCommandStore';

export function HoverHud() {
  const slug = useCommandStore((s) => s.hoveredProject);
  const view = useCommandStore((s) => s.view);
  if (!slug || view !== 'universe') return null;
  const name = slug === 'ceo' ? 'CEO' : getProject(slug)?.name;
  if (!name) return null;
  return (
    <div className="pointer-events-none fixed left-4 top-14 z-20 hidden md:block text-[12px] font-light tracking-[0.18em] text-[rgba(230,232,236,0.88)] [text-shadow:0_1px_8px_rgba(0,0,0,0.8)]">
      {name}
    </div>
  );
}

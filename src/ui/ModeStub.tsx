'use client';

import { Glass } from '@/ui/Glass';
import { useCommandStore } from '@/store/useCommandStore';

export function ModeStub() {
  const mode = useCommandStore((s) => s.mode);
  const view = useCommandStore((s) => s.view);
  if (view === 'boot' || mode === 'default' || mode === 'analytics') return null;
  const copy =
    mode === 'economy'
      ? 'Economy layer will map cashflow through the universe. Scaffold only.'
      : 'Workforce layer highlights every agent in the current world.';
  return (
    <Glass className="fixed top-14 left-1/2 z-20 hidden -translate-x-1/2 px-3.5 py-2 text-[11px] text-[var(--muted)] md:block">
      {copy}
      <span className="tag">soon</span>
    </Glass>
  );
}

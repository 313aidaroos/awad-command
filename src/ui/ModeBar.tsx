'use client';

import { useCommandStore } from '@/store/useCommandStore';
import type { ModeName } from '@/store/types';

const MODES: { id: ModeName; label: string }[] = [
  { id: 'default', label: 'Universe' },
  { id: 'economy', label: 'Economy' },
  { id: 'workforce', label: 'Workforce' },
];

export function ModeBar() {
  const mode = useCommandStore((s) => s.mode);
  const setMode = useCommandStore((s) => s.setMode);
  const view = useCommandStore((s) => s.view);
  if (view === 'boot') return null;
  return (
    <div className="pointer-events-auto fixed top-2.5 left-1/2 z-20 -translate-x-1/2 hidden md:flex gap-1 rounded-full bg-[rgba(23,26,31,0.45)] p-[3px]">
      {MODES.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => setMode(item.id)}
          className={`rounded-full px-3 py-1 text-[11px] ${
            mode === item.id ? 'bg-white/8 text-[var(--text)]' : 'text-[var(--muted)]'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

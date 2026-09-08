'use client';

import { Glass } from '@/ui/Glass';
import { useCommandStore } from '@/store/useCommandStore';

export function ComputerPanel() {
  const open = useCommandStore((s) => s.contextPanel === 'computer');
  const closePanel = useCommandStore((s) => s.closePanel);
  if (!open) return null;
  return (
    <Glass className="fixed left-1/2 top-24 z-30 w-[min(420px,calc(100%-32px))] -translate-x-1/2 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-light tracking-[0.2em]">Computer</h3>
        <button type="button" onClick={closePanel} className="text-[11px] text-[var(--muted)]">
          Close
        </button>
      </div>
      <p className="text-xs text-[var(--muted)] leading-relaxed">
        Agent screen is coming online. The worker, browser, and live view land in Part D — see
        docs/COMPUTER.md. Nothing here spends, publishes, or deletes.
      </p>
      <div className="mt-4 aspect-video rounded-lg border border-[var(--line)] bg-black/40 grid place-items-center text-[11px] tracking-[0.14em] text-[var(--muted)]">
        coming online
      </div>
    </Glass>
  );
}

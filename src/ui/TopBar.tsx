'use client';

import { PRODUCT_NAME } from '@/lib/branding';
import { ApixisCompanyBadge } from '@/ui/ApixisCompanyBadge';
import { useCommandStore } from '@/store/useCommandStore';

export function TopBar() {
  const dataMode = useCommandStore((s) => s.dataMode);
  const togglePalette = useCommandStore((s) => s.togglePalette);

  return (
    <header className="pointer-events-none fixed top-0 inset-x-0 z-20">
      <div className="pointer-events-auto absolute left-4 top-4">
        <div className="text-[11px] font-light tracking-[0.34em] text-[rgba(230,232,236,0.72)]">
          {PRODUCT_NAME}
          {dataMode === 'demo' ? <span className="tag">DEMO</span> : null}
        </div>
        <ApixisCompanyBadge className="mt-1.5 block" />
      </div>
      <button
        type="button"
        onClick={() => togglePalette(true)}
        className="pointer-events-auto absolute right-4 top-4 font-num text-[11px] text-[var(--muted)] rounded-full border border-[var(--line)] px-2.5 py-1 hover:text-[var(--text)]"
      >
        ⌘K
      </button>
    </header>
  );
}

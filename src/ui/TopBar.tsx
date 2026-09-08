'use client';

import { useEffect, useState } from 'react';
import { useCommandStore } from '@/store/useCommandStore';

export function TopBar() {
  const dataMode = useCommandStore((s) => s.dataMode);
  const quality = useCommandStore((s) => s.quality.level);
  const togglePalette = useCommandStore((s) => s.togglePalette);
  const toggleEventStream = useCommandStore((s) => s.toggleEventStream);
  const toggleNews = useCommandStore((s) => s.toggleNews);
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <header className="pointer-events-auto fixed top-0 inset-x-0 z-20 flex h-12 items-center justify-between px-[18px]">
      <div className="text-xs font-light tracking-[0.32em]">
        AWAD COMMAND
        {dataMode === 'demo' ? <span className="tag">demo data</span> : null}
      </div>
      <button
        type="button"
        onClick={() => togglePalette(true)}
        className="font-num text-[11px] text-[var(--muted)] rounded-full border border-[var(--line)] px-3 py-1 hover:text-[var(--text)]"
      >
        ⌘K
      </button>
      <div className="flex items-center gap-3 font-num text-[11px] text-[var(--muted)]">
        <button type="button" onClick={() => toggleEventStream()} className="hover:text-[var(--text)]">
          Events
        </button>
        <button type="button" onClick={() => toggleNews()} className="hover:text-[var(--text)]">
          News
        </button>
        <span>{quality.toUpperCase()}</span>
        <span>{time}</span>
      </div>
    </header>
  );
}

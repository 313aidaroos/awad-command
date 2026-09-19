'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MODULES } from '@/config/modules';
import { CommandButton } from '@/landing/primitives';
import { requestCeoOpen } from '@/lib/ceoBridge';

export function HeroCommandCenter({ up, total }: { up: number; total: number }) {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
      <div className="flex flex-col justify-center py-4">
        <div className="retro-panel-title mb-3">WELCOME TO</div>
        <h1 className="font-display text-[26px] leading-[1.35] text-[var(--text)] sm:text-[34px] lg:text-[40px]">AWAD COMMAND</h1>
        <div className="mt-3 text-[12px] tracking-[0.22em] text-[var(--amber)]">ONE VISION. ALL SYSTEMS. NO LIMITS.</div>
        <p className="mt-4 max-w-xl text-[13px] leading-relaxed text-[var(--muted)]">
          Your AI-powered command center for building, managing, automating, and scaling companies, investments, content, and operations — all in one place.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <CommandButton href="/command" primary>ENTER COMMAND CENTER →</CommandButton>
          <CommandButton onClick={requestCeoOpen}>ASK CIXY</CommandButton>
          <CommandButton href="/system">LEARN MORE</CommandButton>
        </div>
        <blockquote className="mt-6 border-l border-[var(--line-2)] pl-3 text-[12px] italic text-[var(--muted)]">
          “Discipline today builds the freedom tomorrow.”<br /><span className="not-italic">— Awad</span>
        </blockquote>
      </div>

      {/* Command room: three monitors */}
      <div className="relative overflow-hidden border border-[var(--line)] bg-[radial-gradient(ellipse_at_top,rgba(244,185,66,0.08),transparent_60%),linear-gradient(180deg,#0b1118,#070b0f)] p-4">
        <div className="grid grid-cols-[1fr_1.6fr_1fr] gap-3">
          <Monitor lines={['BUILD', 'AUTOMATE', 'SCALE', 'INVEST', 'CREATE', 'GIVE BACK']} />
          <div className="monitor-glow flex flex-col justify-between border border-[var(--line-2)] bg-[var(--panel)] p-3">
            <div className="retro-panel-title">MAIN SCREEN</div>
            <div className="py-6 text-center">
              <div className="font-display text-[10px] leading-loose sm:text-[12px]">AWAD COMMAND</div>
              <div className="mt-2 text-[10px] tracking-[0.3em] text-[var(--cyan)]">GLOBAL OPERATIONS</div>
            </div>
            <WorldGrid />
            <div className="font-num mt-2 flex justify-between text-[10px] text-[var(--muted)]">
              <span>SITES {up}/{total}</span>
              <span className="text-[var(--green)]">{total > 0 && up === total ? 'NOMINAL' : total === 0 ? 'PROBING' : 'ATTENTION'}</span>
            </div>
          </div>
          <Monitor lines={['IDEAS', 'AGENTS', 'COMPANIES', 'ASSETS', 'OPPORTUNITIES', 'A BETTER TOMORROW']} />
        </div>
        <div className="mt-3 h-6 border-t border-[var(--line-2)] bg-[linear-gradient(180deg,#141d25,#0b1118)]" aria-hidden />
      </div>
    </section>
  );
}

function Monitor({ lines }: { lines: string[] }) {
  return (
    <div className="border border-[var(--line-2)] bg-[var(--panel)] p-3">
      <div className="retro-panel-title mb-2">TERMINAL</div>
      <ul className="space-y-1.5 text-[10px] tracking-[0.18em] text-[var(--green)]">
        {lines.map((l) => (
          <li key={l}>› {l}</li>
        ))}
      </ul>
    </div>
  );
}

function WorldGrid() {
  // Placeholder world-operations map: cheap CSS grid, no map library. TODO(integration): Geoxis feed.
  return (
    <div className="grid grid-cols-12 gap-[2px]" aria-hidden>
      {Array.from({ length: 60 }).map((_, i) => (
        <span key={i} className="h-1.5" style={{ background: [3, 8, 14, 21, 27, 33, 38, 44, 51, 56].includes(i) ? 'var(--accent)' : 'var(--line)' }} />
      ))}
    </div>
  );
}

export function ModuleStrip() {
  const path = usePathname();
  return (
    <nav className="flex gap-2 overflow-x-auto border-y border-[var(--line)] py-2" aria-label="Modules">
      {MODULES.map((m) => {
        const active = path.startsWith(m.route);
        return (
          <Link
            key={m.id}
            href={m.route}
            className={`flex shrink-0 items-center gap-2 border px-3 py-2 text-[10px] tracking-[0.14em] uppercase ${active ? 'border-[var(--amber)] text-[var(--text)]' : 'border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-2)] hover:text-[var(--text)]'}`}
          >
            <span style={{ color: m.accent }}>{m.glyph}</span>
            {m.short}
          </Link>
        );
      })}
    </nav>
  );
}

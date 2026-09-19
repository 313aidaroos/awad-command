'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

/* ---------- primitives ---------- */

export function RetroPanel({ title, right, children, className = '' }: { title?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`retro-panel p-4 ${className}`}>
      {title ? (
        <header className="mb-3 flex items-center justify-between gap-3">
          <h3 className="retro-panel-title">{title}</h3>
          {right}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export type LedTone = 'green' | 'amber' | 'red' | 'blue' | 'off';

export function Led({ tone = 'green' }: { tone?: LedTone }) {
  return <span className={`led ${tone === 'green' ? '' : tone}`} aria-hidden />;
}

export function StatusBadge({ label, tone }: { label: string; tone: LedTone }) {
  return (
    <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
      <Led tone={tone} />
      {label}
    </span>
  );
}

export function CommandButton({ href, onClick, children, primary = false, external = false }: { href?: string; onClick?: () => void; children: ReactNode; primary?: boolean; external?: boolean }) {
  const cls = `cmd-btn ${primary ? 'primary' : ''}`;
  if (href && external) return <a className={cls} href={href} target="_blank" rel="noreferrer">{children}</a>;
  if (href) return <Link className={cls} href={href}>{children}</Link>;
  return <button type="button" className={cls} onClick={onClick}>{children}</button>;
}

export function MetricCard({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'up' | 'down' | 'flat' }) {
  const color = tone === 'up' ? 'var(--green)' : tone === 'down' ? 'var(--red)' : 'var(--text)';
  return (
    <div className="border border-[var(--line)] bg-[var(--panel-2)] p-3">
      <div className="retro-panel-title">{label}</div>
      <div className="font-num mt-1 text-lg" style={{ color }}>{value}</div>
      {hint ? <div className="mt-0.5 text-[10px] text-[var(--muted)]">{hint}</div> : null}
    </div>
  );
}

export function Unavailable({ reason }: { reason?: string }) {
  return <span className="text-[var(--muted)]" title={reason}>unavailable</span>;
}

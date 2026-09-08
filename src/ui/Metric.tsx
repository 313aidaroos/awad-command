'use client';

import { useCommandStore } from '@/store/useCommandStore';

export function Metric({
  value,
  label,
}: {
  value: string;
  label?: string;
}) {
  const demo = useCommandStore((s) => s.dataMode === 'demo');
  return (
    <span className="inline-flex items-baseline gap-1.5">
      {label ? <span className="text-[var(--muted)]">{label}</span> : null}
      <b className="font-num font-normal text-[var(--text)]">{value}</b>
      {demo ? <span className="tag">DEMO</span> : null}
    </span>
  );
}

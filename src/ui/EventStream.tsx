'use client';

import { clock } from '@/lib/format';
import { getProject } from '@/projects/registry';
import { Glass } from '@/ui/Glass';
import { useCommandStore } from '@/store/useCommandStore';

export function EventStream() {
  const open = useCommandStore((s) => s.eventStreamOpen);
  const view = useCommandStore((s) => s.view);
  const buffer = useCommandStore((s) => s.events.buffer);
  const events = buffer.slice(0, 6);
  if (!open || view !== 'universe') return null;
  return (
    <Glass className="fixed left-4 bottom-24 z-20 hidden md:block w-[280px] p-3.5 text-[11px]">
      <h4 className="mb-2 flex items-center justify-between text-[10px] tracking-[0.14em] text-[var(--muted)] font-normal">
        <span>Event stream</span>
        <span className="tag" style={{ margin: 0 }}>
          demo
        </span>
      </h4>
      <div>
        {events.map((event) => {
          const project = getProject(event.projectSlug);
          return (
            <div key={event.id} className="grid grid-cols-[52px_1fr] gap-2 py-1 text-[var(--muted)]">
              <span className="font-num">{clock(event.ts)}</span>
              <span>
                <span className="mr-1.5 text-[10px] tracking-[0.08em]" style={{ color: project?.accent }}>
                  {project?.name ?? event.projectSlug}
                </span>
                <span className="text-[var(--text)]">{event.summary}</span>
              </span>
            </div>
          );
        })}
      </div>
    </Glass>
  );
}

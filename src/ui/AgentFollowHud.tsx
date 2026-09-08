'use client';

import { projects } from '@/projects/registry';
import { Glass } from '@/ui/Glass';
import { Metric } from '@/ui/Metric';
import { useCommandStore } from '@/store/useCommandStore';

export function AgentFollowHud() {
  const id = useCommandStore((s) => s.followingAgent);
  const runtime = useCommandStore((s) => (id ? s.agents[id] : undefined));
  const stopFollow = useCommandStore((s) => s.stopFollow);
  const project = projects.find((item) => item.agents.some((agent) => agent.id === id));
  const agent = project?.agents.find((item) => item.id === id);
  if (!id || !agent || !runtime || !project) return null;

  return (
    <Glass className="fixed bottom-24 left-1/2 z-20 w-[min(420px,calc(100%-32px))] -translate-x-1/2 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] tracking-[0.16em] text-[var(--muted)]">Following · {project.name}</div>
          <div className="mt-1 text-sm">{agent.name}</div>
          <div className="mt-1 text-[11px] text-[var(--muted)]">
            {runtime.currentTask ?? agent.objective}
            <span className="tag">DEMO</span>
          </div>
          <div className="mt-1.5 font-num text-[10px] text-[var(--muted)]">
            Completed today <Metric value={String(runtime.completedToday)} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => stopFollow()}
          className="rounded-full border border-[var(--line)] px-3 py-1 text-[11px] text-[var(--muted)]"
        >
          Exit follow
        </button>
      </div>
    </Glass>
  );
}

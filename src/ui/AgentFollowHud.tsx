'use client';

import { projects } from '@/projects/registry';
import { useCommandStore } from '@/store/useCommandStore';

export function AgentFollowHud() {
  const id = useCommandStore((s) => s.followingAgent);
  const runtime = useCommandStore((s) => (id ? s.agents[id] : undefined));
  const stopFollow = useCommandStore((s) => s.stopFollow);
  const project = projects.find((item) => item.agents.some((agent) => agent.id === id));
  const agent = project?.agents.find((item) => item.id === id);
  if (!id || !agent || !runtime || !project) return null;

  return (
    <div className="pointer-events-auto fixed bottom-4 left-4 z-20 flex items-center gap-2 rounded-full border border-[var(--line)] bg-[rgba(23,26,31,0.5)] px-3 py-1 text-[11px]">
      <span className="tracking-[0.12em] text-[var(--text)]">{agent.name}</span>
      <span className="tag" style={{ margin: 0 }}>
        DEMO
      </span>
      <button
        type="button"
        onClick={() => stopFollow()}
        className="text-[var(--muted)] hover:text-[var(--text)]"
      >
        Exit
      </button>
    </div>
  );
}

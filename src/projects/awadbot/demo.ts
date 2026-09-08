import { emitEvent, scheduleLoop, type Emit } from '@/projects/demoShared';
import type { ProjectDefinition } from '@/types/project';

export function schedule(emit: Emit, project: ProjectDefinition) {
  const risk = project.agents.find((a) => a.name.startsWith('Risk'));
  const pm = project.agents.find((a) => a.name.startsWith('Portfolio'));
  return scheduleLoop(
    emit,
    project,
    [
      (e, p) =>
        emitEvent(e, p, 'trade.simulated', 'Simulated trade · NVDA +0.4%', {
          agentId: pm?.id,
          payload: { todayPnl: 18, todayPct: 0.02 },
        }),
      (e, p) =>
        emitEvent(e, p, 'agent.task.completed', 'Updated paper-trading risk model', {
          agentId: risk?.id,
        }),
    ],
    8600,
  );
}

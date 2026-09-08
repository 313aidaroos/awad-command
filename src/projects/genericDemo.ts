import { emitEvent, scheduleLoop, type Emit } from '@/projects/demoShared';
import type { EventType } from '@/types/events';
import type { ProjectDefinition } from '@/types/project';

export function genericDemo(type: EventType, summary: string, periodMs: number) {
  return (emit: Emit, project: ProjectDefinition) =>
    scheduleLoop(
      emit,
      project,
      [
        (e, p) => {
          const node = p.nodes[0];
          emitEvent(e, p, type, summary, {
            nodeId: node?.id,
            agentId: p.agents[0]?.id,
          });
        },
        (e, p) => {
          const node = p.nodes[p.nodes.length - 1] ?? p.nodes[0];
          emitEvent(e, p, type, `${summary} · routed`, {
            nodeId: node?.id,
            agentId: p.agents[0]?.id,
          });
        },
      ],
      periodMs,
    );
}

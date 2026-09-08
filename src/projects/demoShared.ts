import { uid } from '@/lib/ids';
import type { CommandEvent, EventType } from '@/types/events';
import type { ProjectDefinition } from '@/types/project';

export type Emit = (event: CommandEvent) => void;

export function emitEvent(
  emit: Emit,
  project: ProjectDefinition,
  type: EventType,
  summary: string,
  extras: Partial<CommandEvent> = {},
) {
  emit({
    id: uid('evt'),
    ts: Date.now(),
    type,
    projectSlug: project.slug,
    summary,
    source: 'demo',
    agentId: extras.agentId ?? project.agents[0]?.id,
    ...extras,
  });
}

export function scheduleLoop(
  emit: Emit,
  project: ProjectDefinition,
  ticks: Array<(emit: Emit, project: ProjectDefinition) => void>,
  periodMs: number,
): () => void {
  let i = 0;
  const timer = setInterval(() => {
    ticks[i % ticks.length]?.(emit, project);
    i += 1;
  }, periodMs);
  return () => clearInterval(timer);
}

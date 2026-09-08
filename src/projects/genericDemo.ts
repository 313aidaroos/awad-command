import { emitEvent, scheduleLoop, type Emit } from '@/projects/demoShared';
import type { EventType } from '@/types/events';
import type { ProjectDefinition } from '@/types/project';

export function genericDemo(type: EventType, summary: string, periodMs: number) {
  return (emit: Emit, project: ProjectDefinition) =>
    scheduleLoop(emit, project, [(e, p) => emitEvent(e, p, type, summary)], periodMs);
}

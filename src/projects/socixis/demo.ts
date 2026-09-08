import { emitEvent, scheduleLoop, type Emit } from '@/projects/demoShared';
import type { ProjectDefinition } from '@/types/project';

export function schedule(emit: Emit, project: ProjectDefinition) {
  return scheduleLoop(
    emit,
    project,
    [
      (e, p) => emitEvent(e, p, 'content.published', 'Published campaign'),
      (e, p) => emitEvent(e, p, 'agent.task.completed', 'Reply Agent cleared inbox'),
    ],
    7800,
  );
}

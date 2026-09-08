import { emitEvent, scheduleLoop, type Emit } from '@/projects/demoShared';
import type { ProjectDefinition } from '@/types/project';

export function schedule(emit: Emit, project: ProjectDefinition) {
  const sales = project.agents.find((a) => a.name.startsWith('Sales'));
  const lead = project.agents.find((a) => a.name.startsWith('Lead'));
  return scheduleLoop(
    emit,
    project,
    [
      (e, p) =>
        emitEvent(e, p, 'lead.created', 'Received new roofing lead', {
          agentId: lead?.id,
        }),
      (e, p) =>
        emitEvent(e, p, 'contractor.contacted', 'Sent contractor outreach', {
          agentId: sales?.id,
        }),
      (e, p) =>
        emitEvent(e, p, 'job.won', 'Job won · $640', {
          agentId: sales?.id,
          payload: { amount: 640 },
        }),
      (e, p) =>
        emitEvent(e, p, 'flow.advanced', 'Lead moved through the pipeline', {
          flowId: p.flows[0]?.id,
          flowInstanceId: `contraxis-flow-${Math.floor(Date.now() / 8000)}`,
        }),
    ],
    5200,
  );
}

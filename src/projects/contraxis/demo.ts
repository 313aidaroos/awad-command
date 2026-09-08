import { emitEvent, scheduleLoop, type Emit } from '@/projects/demoShared';
import type { ProjectDefinition } from '@/types/project';

function nodeId(project: ProjectDefinition, label: string) {
  return project.nodes.find((node) => node.label === label)?.id;
}

export function schedule(emit: Emit, project: ProjectDefinition) {
  const sales = project.agents.find((a) => a.name.startsWith('Sales'));
  const lead = project.agents.find((a) => a.name.startsWith('Lead'));
  const flowId = project.flows[0]?.id;
  const instance = () => `contraxis-flow-${Math.floor(Date.now() / 32000)}`;

  return scheduleLoop(
    emit,
    project,
    [
      (e, p) =>
        emitEvent(e, p, 'lead.created', 'Inbound roofing request captured', {
          agentId: lead?.id,
          nodeId: nodeId(p, 'Customers'),
          flowId,
          flowInstanceId: instance(),
        }),
      (e, p) =>
        emitEvent(e, p, 'lead.qualified', 'Lead qualified · roof + gutter', {
          agentId: lead?.id,
          nodeId: nodeId(p, 'Qualification'),
          flowId,
          flowInstanceId: instance(),
        }),
      (e, p) =>
        emitEvent(e, p, 'flow.advanced', 'Lead written to Contraxis DB', {
          agentId: p.agents.find((a) => a.name.startsWith('Analytics'))?.id,
          nodeId: nodeId(p, 'Database'),
          flowId,
          flowInstanceId: instance(),
        }),
      (e, p) =>
        emitEvent(e, p, 'contractor.contacted', 'Matched three local contractors', {
          agentId: sales?.id,
          nodeId: nodeId(p, 'Matching'),
          flowId,
          flowInstanceId: instance(),
        }),
      (e, p) =>
        emitEvent(e, p, 'contractor.responded', 'Contractor accepted the job', {
          agentId: sales?.id,
          nodeId: nodeId(p, 'Contractor'),
          flowId,
          flowInstanceId: instance(),
        }),
      (e, p) =>
        emitEvent(e, p, 'job.won', 'Job won · $640', {
          agentId: sales?.id,
          nodeId: nodeId(p, 'Job'),
          flowId,
          flowInstanceId: instance(),
          payload: { amount: 640 },
        }),
      (e, p) =>
        emitEvent(e, p, 'payment.received', 'Revenue booked on the job', {
          agentId: sales?.id,
          nodeId: nodeId(p, 'Revenue'),
          flowId,
          flowInstanceId: instance(),
          payload: { amount: 640 },
        }),
      (e, p) =>
        emitEvent(e, p, 'flow.advanced', 'Pipeline cycle complete', {
          agentId: sales?.id,
          nodeId: nodeId(p, 'Revenue'),
          flowId,
          flowInstanceId: instance(),
        }),
    ],
    3800,
  );
}

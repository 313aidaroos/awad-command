export type EventType =
  | 'agent.task.started'
  | 'agent.task.completed'
  | 'agent.status.changed'
  | 'lead.created'
  | 'lead.qualified'
  | 'contractor.contacted'
  | 'contractor.responded'
  | 'job.won'
  | 'job.lost'
  | 'sale.created'
  | 'payment.received'
  | 'email.received'
  | 'deployment.completed'
  | 'content.published'
  | 'trade.simulated'
  | 'trade.proposed'
  | 'system.error'
  | 'project.status.changed'
  | 'approval.requested'
  | 'approval.resolved'
  | 'flow.advanced'
  | 'lead.message.queued'
  | 'lead.message.delivered'
  | 'lead.message.failed'
  | 'lead.message.replied';

export interface CommandEvent {
  id: string;
  ts: number;
  type: EventType;
  projectSlug: string;
  agentId?: string;
  nodeId?: string;
  flowId?: string;
  flowStageId?: string;
  flowInstanceId?: string;
  summary: string;
  payload?: Record<string, unknown>;
  source: 'demo' | 'live';
}

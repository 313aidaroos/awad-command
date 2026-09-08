import type { CommandState } from '@/store/types';
import type { CommandEvent } from '@/types/events';
import type { AgentStatus } from '@/types/agent';

const MAX_EVENTS = 500;

function num(metrics: Record<string, number | number[] | undefined>, key: string, fallback = 0) {
  const value = metrics[key];
  return typeof value === 'number' ? value : fallback;
}

export function applyEventToState(state: CommandState, event: CommandEvent): void {
  state.events.buffer = [event, ...state.events.buffer].slice(0, MAX_EVENTS);
  state.events.unread += 1;

  const project = state.projects[event.projectSlug];
  if (project) {
    project.lastEventTs = event.ts;
    project.activity = Math.min(1, project.activity + 0.08);
    const metrics = project.metrics;

    if (event.type === 'lead.created') metrics.newLeads = num(metrics, 'newLeads') + 1;
    if (event.type === 'lead.qualified') metrics.qualifiedLeads = num(metrics, 'qualifiedLeads') + 1;
    if (event.type === 'job.won') {
      metrics.jobsWon = num(metrics, 'jobsWon') + 1;
      const amount = Number(event.payload?.amount ?? 0);
      metrics.revenueToday = num(metrics, 'revenueToday') + amount;
    }
    if (event.type === 'job.lost') metrics.jobsLost = num(metrics, 'jobsLost') + 1;
    if (event.type === 'payment.received' || event.type === 'sale.created') {
      metrics.revenueToday = num(metrics, 'revenueToday') + Number(event.payload?.amount ?? 0);
    }
    if (event.type === 'trade.simulated') {
      metrics.todayPnl = num(metrics, 'todayPnl') + Number(event.payload?.todayPnl ?? 0);
      metrics.todayPct = num(metrics, 'todayPct') + Number(event.payload?.todayPct ?? 0);
    }
    if (event.type === 'project.status.changed' && typeof event.payload?.status === 'string') {
      project.status = event.payload.status as typeof project.status;
    }
    if (event.type === 'system.error') project.status = 'attention';
  }

  if (event.agentId && state.agents[event.agentId]) {
    const agent = state.agents[event.agentId];
    if (event.type === 'agent.status.changed' && typeof event.payload?.status === 'string') {
      agent.status = event.payload.status as AgentStatus;
    } else if (event.type === 'agent.task.started') {
      agent.status = 'working';
      agent.currentTask = event.summary;
    } else if (event.type === 'agent.task.completed') {
      agent.status = 'idle';
      agent.completedToday += 1;
      agent.currentTask = undefined;
    } else if (event.type === 'system.error') {
      agent.status = 'error';
    } else if (event.type.startsWith('lead.') || event.type.startsWith('job.') || event.type === 'content.published') {
      agent.status = 'working';
      agent.currentTask = event.summary;
    }
    if (event.nodeId) {
      agent.fromNodeId = agent.targetNodeId;
      agent.targetNodeId = event.nodeId;
      agent.moveStartedAt = event.ts;
    }
    agent.recentActions = [{ ts: event.ts, text: event.summary, eventId: event.id }, ...agent.recentActions].slice(0, 20);
  }

  if (event.type === 'flow.advanced' && event.flowId && event.flowInstanceId) {
    const existing = state.flows[event.flowInstanceId];
    if (existing) {
      existing.stageIndex += 1;
      existing.stageStartedAt = event.ts;
    } else {
      state.flows[event.flowInstanceId] = {
        flowId: event.flowId,
        projectSlug: event.projectSlug,
        stageIndex: 0,
        startedAt: event.ts,
        stageStartedAt: event.ts,
      };
    }
  }
}

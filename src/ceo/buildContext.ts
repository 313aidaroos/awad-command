import { describeLeadOwnership } from '@/config/orbLeads';
import { projects } from '@/projects/registry';
import type { CommandState } from '@/store/types';

export function buildContext(state: Pick<CommandState, 'dataMode' | 'projects' | 'agents' | 'events' | 'approvals'>) {
  const lines: string[] = [`dataMode=${state.dataMode}`];
  for (const project of projects) {
    const runtime = state.projects[project.slug];
    if (!runtime) continue;
    const agentIds = project.agents.map((a) => a.id);
    const working = agentIds.filter((id) => state.agents[id]?.status === 'working').length;
    lines.push(
      `${project.slug}: status=${runtime.status} mrr=${runtime.metrics.mrr} today=${runtime.metrics.revenueToday} leads=${runtime.metrics.newLeads} activity=${runtime.activity.toFixed(2)} agents=${working}/${project.agents.length}${project.comingSoon ? ' comingSoon' : ''}`,
    );
  }
  lines.push('Lead ownership:');
  lines.push(describeLeadOwnership());
  lines.push('Recent events:');
  for (const event of state.events.buffer.slice(0, 40)) {
    lines.push(`${event.projectSlug} ${event.type} ${event.summary}`);
  }
  const pending = state.approvals.filter((a) => a.status === 'pending');
  lines.push(`Open approvals: ${pending.length}`);
  return lines.join('\n');
}

export function attentionItems(state: Pick<CommandState, 'projects' | 'agents' | 'events'>) {
  const items: string[] = [];
  for (const project of projects) {
    const runtime = state.projects[project.slug];
    if (runtime && ['attention', 'warning', 'error'].includes(runtime.status)) {
      items.push(`${project.name} is ${runtime.status}`);
    }
  }
  for (const [id, agent] of Object.entries(state.agents)) {
    if (agent.status === 'blocked' || agent.status === 'error' || agent.status === 'needs_approval') {
      items.push(`${id} is ${agent.status}`);
    }
  }
  return items;
}

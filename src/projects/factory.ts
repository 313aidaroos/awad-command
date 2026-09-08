import type { AgentDefinition } from '@/types/agent';
import type { ProjectDefinition, ProjectMetrics, ProjectStatus } from '@/types/project';
import type { Flow, WorldNode } from '@/types/world';

export function ringPositions(
  count: number,
  radius: number,
  y = 0,
): [number, number, number][] {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    return [Math.cos(a) * radius, y + ((i % 3) - 1) * 0.35, Math.sin(a) * radius];
  });
}

export function makeAgents(
  projectSlug: string,
  members: {
    name: string;
    role: string;
    objective: string;
    tools: string[];
    position?: [number, number, number];
  }[],
  radius = 4.5,
): AgentDefinition[] {
  const spots = ringPositions(members.length, radius, 0.4);
  return members.map((member, i) => ({
    id: `${projectSlug}.${member.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    projectSlug,
    name: member.name,
    role: member.role,
    objective: member.objective,
    tools: member.tools,
    homePosition: member.position ?? spots[i] ?? [radius, 0, 0],
  }));
}

export function makeNodes(
  projectSlug: string,
  labels: { label: string; kind: WorldNode['kind']; position?: [number, number, number] }[],
  radius = 7.5,
): WorldNode[] {
  const spots = ringPositions(labels.length, radius, -0.2);
  return labels.map((node, i) => ({
    id: `${projectSlug}.node.${node.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    label: node.label,
    kind: node.kind,
    position: node.position ?? spots[i] ?? [radius, 0, 0],
  }));
}

export function baseMetrics(partial: Partial<ProjectMetrics>): ProjectMetrics {
  return {
    mrr: 0,
    arr: 0,
    revenueToday: 0,
    revenue30d: Array.from({ length: 30 }, () => 0),
    activeUsers: 0,
    newLeads: 0,
    qualifiedLeads: 0,
    jobsWon: 0,
    jobsLost: 0,
    conversionRate: 0,
    cac: 0,
    ltv: 0,
    avgLeadValue: 0,
    operatingCosts: 0,
    profit: 0,
    growthRate: 0,
    customers: 0,
    ...partial,
  };
}

export function defineProject(
  def: Omit<ProjectDefinition, 'analyticsKeys'> & { analyticsKeys?: ProjectDefinition['analyticsKeys'] },
): ProjectDefinition {
  return {
    analyticsKeys: ['mrr', 'revenueToday', 'activeUsers', 'newLeads', 'conversionRate'],
    ...def,
  };
}

export function simpleFlow(
  id: string,
  label: string,
  stages: { id: string; label: string; atAgentId?: string; atNodeId?: string }[],
): Flow {
  return {
    id,
    label,
    stages: stages.map((stage) => ({ ...stage, durationMs: 2400 })),
  };
}

export function statusOf(status: ProjectStatus): ProjectStatus {
  return status;
}

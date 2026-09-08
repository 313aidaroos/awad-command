import type { AgentDefinition } from '@/types/agent';
import type { Flow, WorldNode } from '@/types/world';

export type ProjectStatus =
  | 'operational'
  | 'active'
  | 'idle'
  | 'attention'
  | 'warning'
  | 'error'
  | 'offline';

export interface ProjectMetrics {
  mrr: number;
  arr: number;
  revenueToday: number;
  revenue30d: number[];
  activeUsers: number;
  newLeads: number;
  qualifiedLeads: number;
  jobsWon: number;
  jobsLost: number;
  conversionRate: number;
  cac: number;
  ltv: number;
  avgLeadValue: number;
  operatingCosts: number;
  profit: number;
  growthRate: number;
  customers: number;
  contractors?: number;
  [key: string]: number | number[] | undefined;
}

export interface ProjectDefinition {
  slug: string;
  name: string;
  tagline: string;
  accent: string;
  universePosition: [number, number, number];
  connections: { to: string; kind: 'marketing' | 'technology' | 'publishing' | 'data' }[];
  agents: AgentDefinition[];
  nodes: WorldNode[];
  flows: Flow[];
  initialMetrics: ProjectMetrics;
  initialStatus: ProjectStatus;
  analyticsKeys: (keyof ProjectMetrics)[];
  comingSoon?: boolean;
}

export interface ProjectRuntime {
  status: ProjectStatus;
  metrics: ProjectMetrics;
  activity: number;
  lastEventTs: number;
}

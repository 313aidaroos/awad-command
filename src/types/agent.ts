export type AgentStatus =
  | 'working'
  | 'idle'
  | 'waiting'
  | 'blocked'
  | 'error'
  | 'needs_approval';

export interface AgentDefinition {
  id: string;
  projectSlug: string;
  name: string;
  role: string;
  objective: string;
  tools: string[];
  homePosition: [number, number, number];
}

export interface AgentAction {
  ts: number;
  text: string;
  eventId: string;
}

export interface AgentState {
  id: string;
  status: AgentStatus;
  currentTask?: string;
  targetNodeId?: string;
  completedToday: number;
  successRate: number;
  activeSince: number;
  recentActions: AgentAction[];
  stats: Record<string, number>;
}

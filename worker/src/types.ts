export type TaskStatus =
  | 'queued'
  | 'claimed'
  | 'running'
  | 'done'
  | 'failed'
  | 'cancelled'
  | 'waiting_approval';

export type ApprovalStatus = 'pending' | 'approved' | 'denied';

export type ToolRisk = 'read' | 'write' | 'money' | 'destructive';

export interface TaskRow {
  id: string;
  created_at: string;
  agent_id: string;
  title: string;
  instruction: string | null;
  status: TaskStatus;
  source: string | null;
  created_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  result: Record<string, unknown> | null;
  error: string | null;
  report: string | null;
  lease_until: string | null;
  worker_id: string | null;
  claimed_at: string | null;
  budget_usd: number | string | null;
  spent_usd: number | string | null;
  approval_id: string | null;
}

export interface ApprovalRow {
  id: string;
  status: ApprovalStatus | string;
  title?: string | null;
  kind?: string | null;
  risk?: string | null;
}

export interface AgentRow {
  id: string;
  project_slug: string;
  name: string;
  role: string | null;
  objective: string | null;
  tools: string[] | null;
  memory: Record<string, unknown> | null;
}

export interface ProjectRow {
  slug: string;
  name: string;
  status: string;
}

export interface EventInsert {
  type: string;
  project_slug?: string | null;
  agent_id?: string | null;
  summary: string;
  payload?: Record<string, unknown>;
  source?: 'live' | 'demo';
}

export interface TaskPatch {
  status?: TaskStatus;
  started_at?: string | null;
  completed_at?: string | null;
  result?: Record<string, unknown> | null;
  error?: string | null;
  report?: string | null;
  lease_until?: string | null;
  worker_id?: string | null;
  claimed_at?: string | null;
  spent_usd?: number;
}

export const QUERY_VIEWS = ['v_leads', 'v_sales', 'v_events', 'v_metrics'] as const;
export type QueryView = (typeof QUERY_VIEWS)[number];

export function asNumber(value: number | string | null | undefined, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

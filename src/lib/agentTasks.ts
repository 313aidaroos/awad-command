import { projects } from '@/projects/registry';
import { inferComputerCapabilities } from '@/lib/computerScreen';
import { createServiceSupabase } from '@/lib/supabase/service';
import type { Approval, ApprovalKind, ApprovalRisk } from '@/types/approval';
import type { AgentDefinition } from '@/types/agent';
import type { ProposeApprovalArgs } from '@/ceo/tools.types';

export type TaskRisk = ApprovalRisk;

export interface CreateTaskInput {
  agentId: string;
  instruction: string;
  title: string;
  requiresApproval: boolean;
  risk: TaskRisk;
  kind?: ApprovalKind;
  capabilities?: string[];
}

export interface CreatedTask {
  ok: boolean;
  demo: boolean;
  taskId: string;
  approvalId?: string;
  agentId: string;
  projectSlug: string;
  title: string;
  instruction: string;
  status: 'queued' | 'waiting_approval';
  requiresApproval: boolean;
  risk: TaskRisk;
  kind: ApprovalKind;
  capabilities: string[];
  error?: string;
  approval?: ProposeApprovalArgs & { id: string; taskId: string };
}

export interface ResolveApprovalResult {
  ok: boolean;
  demo: boolean;
  error?: string;
  approvalId: string;
  decision: 'approved' | 'denied';
  taskId?: string;
}

export function allAgents(): AgentDefinition[] {
  return projects.flatMap((project) => project.agents);
}

export function resolveAgentRef(raw: string): AgentDefinition | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  const agents = allAgents();
  const exact = agents.find((agent) => agent.id === value);
  if (exact) return exact;
  const lower = value.toLowerCase();
  const withAgent = lower.endsWith('-agent') ? lower : `${lower}-agent`;
  const bySlug = agents.find((agent) => agent.id === withAgent || agent.id.toLowerCase() === lower);
  if (bySlug) return bySlug;
  return agents.find((agent) => {
    const name = agent.name.toLowerCase();
    return name === lower || name === `${lower} agent` || agent.id.endsWith(`.${lower.replace(/\s+/g, '-')}`);
  });
}

export function inferApprovalKind(instruction: string, fallback: ApprovalKind = 'other'): ApprovalKind {
  const q = instruction.toLowerCase();
  if (/deploy|release|ship/.test(q)) return 'deploy';
  if (/refund|pay|invoice|spend|payout|stripe/.test(q)) return 'financial';
  if (/campaign|ad\b|ads\b|publish/.test(q)) return 'campaign';
  return fallback;
}

export function formatTaskCreateStatus(result: CreatedTask): string {
  if (!result.ok) return result.error ?? 'Could not create the task.';
  if (result.demo) {
    return result.requiresApproval
      ? `Task “${result.title}” is waiting for approval (DEMO). The worker will not run until SERVICE_ROLE and the worker process are connected.`
      : `Task “${result.title}” queued locally (DEMO). No worker is connected.`;
  }
  const computer =
    result.capabilities.includes('computer')
      ? ' It needs a computer worker (WORKER_CAPABILITIES=computer).'
      : '';
  return result.requiresApproval
    ? `Task “${result.title}” is waiting for your approval. I'll report when it completes.${computer}`
    : `Queued “${result.title}” for ${result.agentId}. I'll report when it completes.${computer}`;
}

export interface AgentTaskStore {
  from: (table: string) => {
    upsert: (row: Record<string, unknown>, opts?: { onConflict?: string }) => Promise<{ error: { message: string } | null }>;
    insert: (row: Record<string, unknown>) => Promise<{
      data: Record<string, unknown> | null;
      error: { message: string } | null;
    }>;
    update: (row: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
    };
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
        limit: (n: number) => Promise<{ data: Array<Record<string, unknown>> | null; error: { message: string } | null }>;
      };
    };
  };
}

/** Service-role client that returns inserted rows. Never import this helper from client components. */
export function wrapServiceClient(client: ReturnType<typeof createServiceSupabase>): AgentTaskStore | null {
  if (!client) return null;
  return {
    from(table) {
      return {
        async upsert(row, opts) {
          const { error } = await client.from(table).upsert(row, opts);
          return { error };
        },
        async insert(row) {
          const { data, error } = await client.from(table).insert(row).select('*').single();
          return { data: data as Record<string, unknown> | null, error };
        },
        update(row) {
          return {
            async eq(column, value) {
              const { error } = await client.from(table).update(row).eq(column, value);
              return { error };
            },
          };
        },
        select(columns) {
          return {
            eq(column, value) {
              return {
                async maybeSingle() {
                  const { data, error } = await client.from(table).select(columns).eq(column, value).maybeSingle();
                  return { data: data as Record<string, unknown> | null, error };
                },
                async limit(n) {
                  const { data, error } = await client.from(table).select(columns).eq(column, value).limit(n);
                  return { data: (data as Array<Record<string, unknown>> | null) ?? null, error };
                },
              };
            },
          };
        },
      };
    },
  };
}

function localId(): string {
  return crypto.randomUUID();
}

async function ensureAgentRows(
  supabase: AgentTaskStore,
  agent: AgentDefinition,
): Promise<{ error?: string }> {
  const project = projects.find((item) => item.slug === agent.projectSlug);
  const projectWrite = await supabase.from('projects').upsert(
    {
      slug: agent.projectSlug,
      name: project?.name ?? agent.projectSlug,
      status: project?.initialStatus ?? 'operational',
      accent: project?.accent ?? null,
    },
    { onConflict: 'slug' },
  );
  if (projectWrite.error) return { error: projectWrite.error.message };
  const agentWrite = await supabase.from('agents').upsert(
    {
      id: agent.id,
      project_slug: agent.projectSlug,
      name: agent.name,
      role: agent.role,
      objective: agent.objective,
      tools: agent.tools,
      status: 'idle',
    },
    { onConflict: 'id' },
  );
  if (agentWrite.error) return { error: agentWrite.error.message };
  return {};
}

export async function persistCeoTask(
  input: CreateTaskInput,
  deps: { supabase?: AgentTaskStore | null; now?: () => number; id?: () => string } = {},
): Promise<CreatedTask> {
  const agent = resolveAgentRef(input.agentId);
  if (!agent) {
    return {
      ok: false,
      demo: true,
      taskId: '',
      agentId: input.agentId,
      projectSlug: '',
      title: input.title,
      instruction: input.instruction,
      status: 'queued',
      requiresApproval: input.requiresApproval,
      risk: input.risk,
      kind: input.kind ?? 'other',
      capabilities: input.capabilities ?? inferComputerCapabilities(input.instruction),
      error: `Unknown agent ${input.agentId}. Nothing was queued.`,
    };
  }

  const kind =
    input.kind === 'deploy' || input.kind === 'campaign' || input.kind === 'financial' || input.kind === 'other'
      ? input.kind
      : inferApprovalKind(input.instruction);
  const capabilities = input.capabilities ?? inferComputerCapabilities(input.instruction);
  const requiresApproval =
    input.requiresApproval || input.risk === 'high' || kind === 'financial' || capabilities.includes('computer');
  const title = input.title.trim() || input.instruction.slice(0, 80);
  const supabase = deps.supabase === undefined ? wrapServiceClient(createServiceSupabase()) : deps.supabase;
  const id = deps.id ?? localId;

  if (!supabase) {
    const taskId = id();
    const approvalId = requiresApproval ? id() : undefined;
    return {
      ok: true,
      demo: true,
      taskId,
      approvalId,
      agentId: agent.id,
      projectSlug: agent.projectSlug,
      title,
      instruction: input.instruction,
      status: requiresApproval ? 'waiting_approval' : 'queued',
      requiresApproval,
      risk: input.risk,
      kind,
      capabilities,
      approval: requiresApproval
        ? {
            id: approvalId!,
            taskId,
            title,
            description: input.instruction,
            kind,
            risk: input.risk,
          }
        : undefined,
    };
  }

  const seeded = await ensureAgentRows(supabase, agent);
  if (seeded.error) {
    return {
      ok: false,
      demo: false,
      taskId: '',
      agentId: agent.id,
      projectSlug: agent.projectSlug,
      title,
      instruction: input.instruction,
      status: 'queued',
      requiresApproval,
      risk: input.risk,
      kind,
      capabilities,
      error: `Could not seed agent rows: ${seeded.error}`,
    };
  }

  let approvalId: string | undefined;
  if (requiresApproval) {
    const inserted = await supabase.from('approvals').insert({
      title,
      description: input.instruction,
      kind,
      risk: input.risk,
      status: 'pending',
      requested_by: 'ceo',
      project_slug: agent.projectSlug,
      action: `create_task:${title}`,
      payload: { source: 'ceo', agentId: agent.id, instruction: input.instruction },
    });
    if (inserted.error || !inserted.data?.id) {
      return {
        ok: false,
        demo: false,
        taskId: '',
        agentId: agent.id,
        projectSlug: agent.projectSlug,
        title,
        instruction: input.instruction,
        status: 'waiting_approval',
        requiresApproval,
        risk: input.risk,
        kind,
        capabilities,
        error: inserted.error?.message ?? 'Approval insert returned no id',
      };
    }
    approvalId = String(inserted.data.id);
  }

  const taskInsert = await supabase.from('agent_tasks').insert({
    agent_id: agent.id,
    title,
    instruction: input.instruction,
    status: requiresApproval ? 'waiting_approval' : 'queued',
    source: 'ceo',
    created_by: 'ceo',
    approval_id: approvalId ?? null,
    budget_usd: 0.5,
    spent_usd: 0,
    capabilities,
  });
  if (taskInsert.error || !taskInsert.data?.id) {
    return {
      ok: false,
      demo: false,
      taskId: '',
      agentId: agent.id,
      projectSlug: agent.projectSlug,
      title,
      instruction: input.instruction,
      status: requiresApproval ? 'waiting_approval' : 'queued',
      requiresApproval,
      risk: input.risk,
      kind,
      capabilities,
      error: taskInsert.error?.message ?? 'Task insert returned no id',
    };
  }

  const taskId = String(taskInsert.data.id);
  return {
    ok: true,
    demo: false,
    taskId,
    approvalId,
    agentId: agent.id,
    projectSlug: agent.projectSlug,
    title,
    instruction: input.instruction,
    status: requiresApproval ? 'waiting_approval' : 'queued',
    requiresApproval,
    risk: input.risk,
    kind,
    capabilities,
    approval: requiresApproval && approvalId
      ? {
          id: approvalId,
          taskId,
          title,
          description: input.instruction,
          kind,
          risk: input.risk,
        }
      : undefined,
  };
}

export async function persistApprovalResolution(
  approvalId: string,
  decision: 'approved' | 'denied',
  deps: { supabase?: AgentTaskStore | null; resolvedBy?: string } = {},
): Promise<ResolveApprovalResult> {
  const supabase = deps.supabase === undefined ? wrapServiceClient(createServiceSupabase()) : deps.supabase;
  if (!supabase) {
    return { ok: true, demo: true, approvalId, decision };
  }

  const now = new Date().toISOString();
  const resolvedBy = deps.resolvedBy ?? 'Awad';
  const approvalWrite = await supabase
    .from('approvals')
    .update({
      status: decision,
      resolved_by: resolvedBy,
      resolved_at: now,
      decided_at: now,
    })
    .eq('id', approvalId);
  if (approvalWrite.error) {
    return { ok: false, demo: false, approvalId, decision, error: approvalWrite.error.message };
  }

  const linked = await supabase.from('agent_tasks').select('id').eq('approval_id', approvalId).limit(1);
  const taskId = linked.data?.[0]?.id ? String(linked.data[0].id) : undefined;
  if (taskId) {
    const nextStatus = decision === 'approved' ? 'queued' : 'cancelled';
    const taskWrite = await supabase
      .from('agent_tasks')
      .update({
        status: nextStatus,
        error: decision === 'denied' ? 'denied' : null,
      })
      .eq('id', taskId);
    if (taskWrite.error) {
      return { ok: false, demo: false, approvalId, decision, taskId, error: taskWrite.error.message };
    }
  }

  const eventWrite = await supabase.from('events').insert({
    type: 'approval.resolved',
    summary: `Approval ${decision}`,
    payload: { approval_id: approvalId, task_id: taskId, decision },
    source: 'live',
  });
  void eventWrite;

  return { ok: true, demo: false, approvalId, decision, taskId };
}

export function approvalFromCreated(task: CreatedTask): Approval | undefined {
  if (!task.approval) return undefined;
  return {
    id: task.approval.id,
    title: task.approval.title,
    description: task.approval.description,
    kind: task.approval.kind,
    risk: task.approval.risk,
    status: 'pending',
    createdAt: Date.now(),
    taskId: task.taskId,
    persisted: !task.demo,
  };
}

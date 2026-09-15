import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { WorkerEnv } from './env.js';
import type { AgentRow, ApprovalRow, EventInsert, ProjectRow, QueryView, TaskPatch, TaskRow } from './types.js';

export function createServiceClient(env: WorkerEnv): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    db: { schema: env.schema },
    auth: { persistSession: false, autoRefreshToken: false },
  }) as SupabaseClient;
}

export interface WorkerDb {
  claimTask: (workerId: string, preferNotProject?: string | null) => Promise<TaskRow | null>;
  updateTask: (id: string, patch: TaskPatch) => Promise<void>;
  insertEvent: (event: EventInsert) => Promise<void>;
  heartbeat: (workerId: string) => Promise<void>;
  releaseTask: (id: string) => Promise<void>;
  getApproval: (id: string) => Promise<ApprovalRow | null>;
  getAgent: (id: string) => Promise<AgentRow | null>;
  getProject: (slug: string) => Promise<ProjectRow | null>;
  queryView: (view: QueryView, opts?: { projectSlug?: string; limit?: number }) => Promise<unknown[]>;
}

function asTask(row: TaskRow | null): TaskRow | null {
  return row ?? null;
}

export function createDb(client: SupabaseClient, leaseMs = 600_000): WorkerDb {
  return {
    async claimTask(workerId, preferNotProject = null) {
      const { data, error } = await client.rpc('claim_queued_task', {
        p_worker_id: workerId,
        p_prefer_not_project: preferNotProject,
      });
      if (error) throw new Error(`claim_queued_task: ${error.message}`);
      const rows = Array.isArray(data) ? data : data ? [data] : [];
      if (rows[0]) return asTask(rows[0] as TaskRow);

      // Fallback when the RPC is not applied yet: reclaim + update … where queued returning.
      const nowIso = new Date().toISOString();
      await client
        .from('agent_tasks')
        .update({ status: 'queued', worker_id: null, claimed_at: null, lease_until: null })
        .in('status', ['claimed', 'running'])
        .lt('lease_until', nowIso);

      const { data: queued, error: listError } = await client
        .from('agent_tasks')
        .select('id')
        .eq('status', 'queued')
        .order('created_at', { ascending: true })
        .limit(1);
      if (listError) throw new Error(`claim list: ${listError.message}`);
      const id = queued?.[0]?.id as string | undefined;
      if (!id) return null;

      const leaseUntil = new Date(Date.now() + leaseMs).toISOString();
      const { data: claimed, error: claimError } = await client
        .from('agent_tasks')
        .update({
          status: 'claimed',
          worker_id: workerId,
          claimed_at: nowIso,
          lease_until: leaseUntil,
        })
        .eq('id', id)
        .eq('status', 'queued')
        .select('*')
        .maybeSingle();
      if (claimError) throw new Error(`claim update: ${claimError.message}`);
      return asTask((claimed as TaskRow | null) ?? null);
    },

    async updateTask(id, patch) {
      const { error } = await client.from('agent_tasks').update(patch).eq('id', id);
      if (error) throw new Error(`updateTask: ${error.message}`);
    },

    async insertEvent(event) {
      const { error } = await client.from('events').insert({
        type: event.type,
        project_slug: event.project_slug ?? null,
        agent_id: event.agent_id ?? null,
        summary: event.summary,
        payload: event.payload ?? {},
        source: event.source ?? 'live',
      });
      if (error) throw new Error(`insertEvent: ${error.message}`);
    },

    async heartbeat(workerId) {
      const { error } = await client.from('system_status').upsert(
        {
          project_slug: `worker:${workerId}`,
          status: 'online',
          detail: { worker_id: workerId, kind: 'worker' },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'project_slug' },
      );
      if (error) throw new Error(`heartbeat: ${error.message}`);
    },

    async releaseTask(id) {
      const { error } = await client
        .from('agent_tasks')
        .update({
          status: 'queued',
          worker_id: null,
          claimed_at: null,
          lease_until: null,
        })
        .eq('id', id)
        .in('status', ['claimed', 'running']);
      if (error) throw new Error(`releaseTask: ${error.message}`);
    },

    async getApproval(id) {
      const { data, error } = await client.from('approvals').select('id, status, title, kind, risk').eq('id', id).maybeSingle();
      if (error) throw new Error(`getApproval: ${error.message}`);
      return (data as ApprovalRow | null) ?? null;
    },

    async getAgent(id) {
      const { data, error } = await client
        .from('agents')
        .select('id, project_slug, name, role, objective, tools, memory')
        .eq('id', id)
        .maybeSingle();
      if (error) throw new Error(`getAgent: ${error.message}`);
      return (data as AgentRow | null) ?? null;
    },

    async getProject(slug) {
      const { data, error } = await client.from('projects').select('slug, name, status').eq('slug', slug).maybeSingle();
      if (error) throw new Error(`getProject: ${error.message}`);
      return (data as ProjectRow | null) ?? null;
    },

    async queryView(view, opts = {}) {
      const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
      let query = client.from(view).select('*').limit(limit);
      if (opts.projectSlug) query = query.eq('project_slug', opts.projectSlug);
      const { data, error } = await query;
      if (error) throw new Error(`queryView ${view}: ${error.message}`);
      return (data as unknown[]) ?? [];
    },
  };
}

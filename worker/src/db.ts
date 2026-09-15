import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { normalizeCapabilities, workerCanClaim } from './capabilities.js';
import type { WorkerEnv } from './env.js';
import type { AgentRow, ApprovalRow, EventInsert, ProjectRow, QueryView, TaskPatch, TaskRow } from './types.js';

export function createServiceClient(env: WorkerEnv): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    db: { schema: env.schema },
    auth: { persistSession: false, autoRefreshToken: false },
  }) as SupabaseClient;
}

export interface ScreenRecordInput {
  project_slug: string;
  task_id: string;
  worker_id?: string | null;
  storage_path: string;
  screenshot_url?: string | null;
  page_url?: string | null;
}

export interface ScreenRecord {
  screenshot_url: string | null;
  storage_path: string;
}

export interface WorkerStatusRow {
  status: string;
  detail: Record<string, unknown> | null;
  updated_at?: string | null;
}

export interface ApprovalInsert {
  title: string;
  description: string;
  kind?: string;
  risk?: string;
  project_slug?: string | null;
  payload?: Record<string, unknown>;
}

export interface WorkerDb {
  claimTask: (workerId: string, preferNotProject?: string | null, capabilities?: string[]) => Promise<TaskRow | null>;
  updateTask: (id: string, patch: TaskPatch) => Promise<void>;
  insertEvent: (event: EventInsert) => Promise<void>;
  heartbeat: (workerId: string, detail?: Record<string, unknown>) => Promise<void>;
  releaseTask: (id: string) => Promise<void>;
  getApproval: (id: string) => Promise<ApprovalRow | null>;
  getAgent: (id: string) => Promise<AgentRow | null>;
  getProject: (slug: string) => Promise<ProjectRow | null>;
  queryView: (view: QueryView, opts?: { projectSlug?: string; limit?: number }) => Promise<unknown[]>;
  getWorkerStatus: (workerId: string) => Promise<WorkerStatusRow | null>;
  insertApproval: (row: ApprovalInsert) => Promise<ApprovalRow>;
  recordScreen: (row: ScreenRecordInput) => Promise<ScreenRecord>;
  uploadScreenshot: (
    path: string,
    bytes: Uint8Array,
    contentType: string,
  ) => Promise<{ path: string; signedUrl?: string }>;
}

function asTask(row: TaskRow | null): TaskRow | null {
  return row ?? null;
}

function taskCapabilities(row: TaskRow): string[] {
  const raw = row.capabilities;
  return Array.isArray(raw) ? raw : [];
}

export function createDb(client: SupabaseClient, leaseMs = 600_000): WorkerDb {
  return {
    async claimTask(workerId, preferNotProject = null, capabilities = []) {
      const caps = normalizeCapabilities(capabilities);
      const { data, error } = await client.rpc('claim_queued_task', {
        p_worker_id: workerId,
        p_prefer_not_project: preferNotProject,
        p_capabilities: caps,
      });
      if (!error) {
        const rows = Array.isArray(data) ? data : data ? [data] : [];
        return asTask((rows[0] as TaskRow) ?? null);
      }
      if (!/p_capabilities|could not find|function.*does not exist/i.test(error.message)) {
        throw new Error(`claim_queued_task: ${error.message}`);
      }

      const nowIso = new Date().toISOString();
      await client
        .from('agent_tasks')
        .update({ status: 'queued', worker_id: null, claimed_at: null, lease_until: null })
        .in('status', ['claimed', 'running'])
        .lt('lease_until', nowIso);

      const { data: queued, error: listError } = await client
        .from('agent_tasks')
        .select('*')
        .eq('status', 'queued')
        .order('created_at', { ascending: true })
        .limit(20);
      if (listError) throw new Error(`claim list: ${listError.message}`);
      const candidate = (queued ?? []).find((row) => workerCanClaim(taskCapabilities(row as TaskRow), caps)) as
        | TaskRow
        | undefined;
      if (!candidate) return null;

      const leaseUntil = new Date(Date.now() + leaseMs).toISOString();
      const { data: claimed, error: claimError } = await client
        .from('agent_tasks')
        .update({
          status: 'claimed',
          worker_id: workerId,
          claimed_at: nowIso,
          lease_until: leaseUntil,
        })
        .eq('id', candidate.id)
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

    async heartbeat(workerId, detail = {}) {
      const slug = `worker:${workerId}`;
      const existing = await this.getWorkerStatus(workerId);
      if (existing?.status === 'halt') {
        const { error } = await client.from('system_status').upsert(
          {
            project_slug: slug,
            status: 'halt',
            detail: { ...(existing.detail ?? {}), ...detail, worker_id: workerId, halted: true },
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'project_slug' },
        );
        if (error) throw new Error(`heartbeat: ${error.message}`);
        return;
      }
      const { error } = await client.from('system_status').upsert(
        {
          project_slug: slug,
          status: 'online',
          detail: { worker_id: workerId, kind: 'worker', ...detail },
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

    async getWorkerStatus(workerId) {
      const { data, error } = await client
        .from('system_status')
        .select('status, detail, updated_at')
        .eq('project_slug', `worker:${workerId}`)
        .maybeSingle();
      if (error) throw new Error(`getWorkerStatus: ${error.message}`);
      if (!data) return null;
      return {
        status: String((data as { status: string }).status),
        detail: ((data as { detail?: Record<string, unknown> }).detail ?? null) as Record<string, unknown> | null,
        updated_at: (data as { updated_at?: string }).updated_at ?? null,
      };
    },

    async insertApproval(row) {
      const { data, error } = await client
        .from('approvals')
        .insert({
          title: row.title,
          description: row.description,
          kind: row.kind ?? 'other',
          risk: row.risk ?? 'high',
          status: 'pending',
          requested_by: 'worker',
          project_slug: row.project_slug ?? null,
          action: `computer:${row.title}`,
          payload: row.payload ?? {},
        })
        .select('id, status, title, kind, risk')
        .single();
      if (error || !data) throw new Error(`insertApproval: ${error?.message ?? 'no row'}`);
      return data as ApprovalRow;
    },

    async recordScreen(row) {
      const { data, error } = await client
        .from('agent_screens')
        .insert({
          project_slug: row.project_slug,
          task_id: row.task_id,
          worker_id: row.worker_id ?? null,
          storage_path: row.storage_path,
          screenshot_url: row.screenshot_url ?? null,
          page_url: row.page_url ?? null,
          source: 'live',
        })
        .select('screenshot_url, storage_path')
        .maybeSingle();
      if (error) {
        return { screenshot_url: row.screenshot_url ?? null, storage_path: row.storage_path };
      }
      return {
        screenshot_url: (data as ScreenRecord | null)?.screenshot_url ?? row.screenshot_url ?? null,
        storage_path: (data as ScreenRecord | null)?.storage_path ?? row.storage_path,
      };
    },

    async uploadScreenshot(path, bytes, contentType) {
      const { error } = await client.storage.from('agent-screens').upload(path, bytes, {
        contentType,
        upsert: true,
      });
      if (error) {
        return { path };
      }
      const signed = await client.storage.from('agent-screens').createSignedUrl(path, 60 * 60);
      return { path, signedUrl: signed.data?.signedUrl };
    },
  };
}

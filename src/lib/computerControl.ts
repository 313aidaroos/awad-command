import { createServiceSupabase } from '@/lib/supabase/service';
import {
  latestScreenshotFromEvents,
  preferNonBlankScreenshot,
  type LatestScreenshot,
} from '@/lib/computerScreen';

export interface ComputerStatus {
  workerConnected: boolean;
  halted: boolean;
  workerId?: string;
  lastHeartbeatAt?: string;
  capabilities: string[];
  latestScreenshot: LatestScreenshot | null;
  stubUrl: string | null;
  demo: boolean;
  needs: string;
}

const STALE_MS = 120_000;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function capList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') return value.split(',').map((part) => part.trim()).filter(Boolean);
  return [];
}

export function stubScreenUrl(env: Record<string, string | undefined> = process.env): string | null {
  const raw = env.NEXT_PUBLIC_COMPUTER_STUB_SCREEN_URL?.trim();
  return raw && /^https?:\/\//i.test(raw) ? raw : null;
}

interface AgentScreenRow {
  screenshot_url?: string | null;
  created_at?: string | null;
  project_slug?: string | null;
  task_id?: string | null;
  page_url?: string | null;
}

async function fetchLatestScreenRows(
  supabase: NonNullable<ReturnType<typeof createServiceSupabase>>,
  projectSlug?: string,
): Promise<AgentScreenRow[]> {
  const run = async (columns: string) => {
    const screens = supabase.from('agent_screens').select(columns);
    const query = projectSlug ? screens.eq('project_slug', projectSlug) : screens;
    return query.order('created_at', { ascending: false }).limit(20);
  };

  const withPage = await run('screenshot_url, created_at, project_slug, task_id, page_url');
  if (!withPage.error) return (withPage.data as AgentScreenRow[] | null) ?? [];
  const fallback = await run('screenshot_url, created_at, project_slug, task_id');
  return (fallback.data as AgentScreenRow[] | null) ?? [];
}

export async function readComputerStatus(
  projectSlug?: string,
): Promise<ComputerStatus> {
  const stubUrl = stubScreenUrl();
  const needs =
    'A Railway or Linux VM running the worker with WORKER_CAPABILITIES=computer, Chromium, and Xvfb. Apply supabase/migrations/0003_computer.sql and create the agent-screens bucket.';
  const supabase = createServiceSupabase();
  if (!supabase) {
    return {
      workerConnected: false,
      halted: false,
      capabilities: [],
      latestScreenshot: stubUrl ? { url: stubUrl, ts: Date.now(), source: 'stub' } : null,
      stubUrl,
      demo: true,
      needs,
    };
  }

  const { data: statusRows } = await supabase
    .from('system_status')
    .select('project_slug, status, detail, updated_at')
    .like('project_slug', 'worker:%')
    .limit(20);

  const now = Date.now();
  const computerRows = (statusRows ?? []).filter((row) => {
    const detail = asRecord(row.detail);
    const caps = capList(detail.capabilities);
    return detail.kind === 'computer-worker' || caps.includes('computer') || caps.some((cap) => cap.startsWith('computer.'));
  });

  const live = computerRows.find((row) => {
    const updated = row.updated_at ? Date.parse(String(row.updated_at)) : 0;
    return Number.isFinite(updated) && now - updated < STALE_MS && row.status !== 'halt';
  });
  const halted = computerRows.some((row) => row.status === 'halt');

  let latestScreenshot: LatestScreenshot | null = null;
  const screenRows = await fetchLatestScreenRows(supabase, projectSlug);
  const screenCandidates: LatestScreenshot[] = [];
  for (const screen of screenRows) {
    if (typeof screen.screenshot_url !== 'string' || !screen.screenshot_url) continue;
    screenCandidates.push({
      url: screen.screenshot_url,
      ts: screen.created_at ? Date.parse(String(screen.created_at)) : now,
      projectSlug: typeof screen.project_slug === 'string' ? screen.project_slug : undefined,
      taskId: screen.task_id ? String(screen.task_id) : undefined,
      source: 'storage',
      pageUrl: typeof screen.page_url === 'string' ? screen.page_url : null,
    });
  }
  latestScreenshot = preferNonBlankScreenshot(screenCandidates);

  if (!latestScreenshot) {
    const events = supabase
      .from('events')
      .select('ts, type, project_slug, summary, payload')
      .eq('type', 'agent.step')
      .order('ts', { ascending: false })
      .limit(40);
    const eventQuery = projectSlug ? events.eq('project_slug', projectSlug) : events;
    const { data: eventRows } = await eventQuery;
    latestScreenshot = latestScreenshotFromEvents(
      (eventRows ?? []).map((row) => ({
        ts: row.ts ? Date.parse(String(row.ts)) : now,
        type: String(row.type ?? 'agent.step'),
        projectSlug: typeof row.project_slug === 'string' ? row.project_slug : undefined,
        summary: typeof row.summary === 'string' ? row.summary : '',
        payload: asRecord(row.payload),
      })),
      projectSlug,
    );
  }

  return {
    workerConnected: Boolean(live),
    halted,
    workerId: live ? String(asRecord(live.detail).worker_id ?? String(live.project_slug).replace(/^worker:/, '')) : undefined,
    lastHeartbeatAt: live?.updated_at ? String(live.updated_at) : undefined,
    capabilities: live ? capList(asRecord(live.detail).capabilities) : [],
    latestScreenshot,
    stubUrl,
    demo: false,
    needs,
  };
}

export async function persistComputerHalt(workerId = '*'): Promise<{ ok: boolean; demo: boolean; error?: string }> {
  const supabase = createServiceSupabase();
  if (!supabase) return { ok: true, demo: true };
  const now = new Date().toISOString();
  if (workerId !== '*') {
    const { error } = await supabase.from('system_status').upsert(
      {
        project_slug: `worker:${workerId}`,
        status: 'halt',
        detail: { worker_id: workerId, kind: 'computer-worker', halted: true },
        updated_at: now,
      },
      { onConflict: 'project_slug' },
    );
    if (error) return { ok: false, demo: false, error: error.message };
    return { ok: true, demo: false };
  }

  const { data, error } = await supabase.from('system_status').select('project_slug, detail').like('project_slug', 'worker:%');
  if (error) return { ok: false, demo: false, error: error.message };
  const rows = data ?? [];
  if (rows.length === 0) {
    const write = await supabase.from('system_status').upsert(
      {
        project_slug: 'worker:all',
        status: 'halt',
        detail: { kind: 'computer-worker', halted: true, worker_id: 'all' },
        updated_at: now,
      },
      { onConflict: 'project_slug' },
    );
    if (write.error) return { ok: false, demo: false, error: write.error.message };
    return { ok: true, demo: false };
  }
  for (const row of rows) {
    const write = await supabase.from('system_status').upsert(
      {
        project_slug: row.project_slug,
        status: 'halt',
        detail: { ...asRecord(row.detail), halted: true },
        updated_at: now,
      },
      { onConflict: 'project_slug' },
    );
    if (write.error) return { ok: false, demo: false, error: write.error.message };
  }
  return { ok: true, demo: false };
}

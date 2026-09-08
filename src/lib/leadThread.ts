import { createServiceSupabase } from '@/lib/supabase/service';
import type { LeadMessage } from '@/types/approval';

const MAX_THREAD = 80;

/** Process-local thread. Survives across route calls in one Next process. */
const threads = new Map<string, LeadMessage[]>();

function sortNewest(messages: LeadMessage[]): LeadMessage[] {
  return [...messages].sort((a, b) => b.ts - a.ts).slice(0, MAX_THREAD);
}

export function appendLeadMessage(message: LeadMessage): LeadMessage {
  const list = threads.get(message.projectSlug) ?? [];
  if (list.some((item) => item.id === message.id)) return message;
  threads.set(message.projectSlug, sortNewest([message, ...list]));
  return message;
}

export function listLeadMessages(projectSlug: string): LeadMessage[] {
  return threads.get(projectSlug) ?? [];
}

function asLeadMessage(row: {
  id: string;
  project_slug: string;
  agent_id: string | null;
  lead_name: string | null;
  message: string;
  status: string;
  created_at: string;
  payload: Record<string, unknown> | null;
}): LeadMessage | null {
  if (!row.project_slug || !row.message) return null;
  const payload = row.payload ?? {};
  const direction =
    payload.direction === 'inbound' || payload.direction === 'outbound'
      ? payload.direction
      : row.status === 'received'
        ? 'inbound'
        : 'outbound';
  const status =
    row.status === 'queued' ||
    row.status === 'delivered' ||
    row.status === 'failed' ||
    row.status === 'received'
      ? row.status
      : direction === 'inbound'
        ? 'received'
        : 'queued';
  const ts =
    typeof payload.ts === 'number' ? payload.ts : new Date(row.created_at).getTime();
  return {
    id: row.id,
    projectSlug: row.project_slug,
    leadName: row.lead_name ?? 'Lead',
    agentId: row.agent_id ?? '',
    message: row.message,
    status,
    ts,
    direction,
    error: typeof payload.error === 'string' ? payload.error : undefined,
  };
}

async function persistLeadRow(message: LeadMessage): Promise<void> {
  const supabase = createServiceSupabase();
  if (!supabase) return;
  const { error } = await supabase.from('lead_messages').insert({
    id: message.id,
    project_slug: message.projectSlug,
    agent_id: message.agentId,
    lead_name: message.leadName,
    message: message.message,
    status: message.status,
    payload: {
      direction: message.direction ?? 'outbound',
      ts: message.ts,
      error: message.error,
    },
  });
  if (error) console.warn('[lead-thread] lead_messages insert failed', error.message);
}

async function persistLeadEvent(message: LeadMessage): Promise<void> {
  const supabase = createServiceSupabase();
  if (!supabase) return;
  const inbound = (message.direction ?? 'outbound') === 'inbound';
  const type = inbound ? 'lead.message.replied' : `lead.message.${message.status}`;
  const { error } = await supabase.from('events').insert({
    type,
    project_slug: message.projectSlug,
    agent_id: message.agentId,
    summary: inbound
      ? `${message.leadName} replied`
      : `Message ${message.status} to ${message.leadName}`,
    payload: { message: message.message, direction: message.direction ?? 'outbound' },
    source: inbound || message.status === 'delivered' ? 'live' : 'demo',
  });
  if (error) console.warn('[lead-thread] events insert failed', error.message);
}

/** Memory first, then optional awad_command.lead_messages + events. */
export async function recordLeadMessage(message: LeadMessage): Promise<LeadMessage> {
  const stored = appendLeadMessage(message);
  await Promise.allSettled([persistLeadRow(stored), persistLeadEvent(stored)]);
  return stored;
}

export async function loadLeadThread(projectSlug: string): Promise<LeadMessage[]> {
  const memory = listLeadMessages(projectSlug);
  const supabase = createServiceSupabase();
  if (!supabase) return memory;
  const { data, error } = await supabase
    .from('lead_messages')
    .select('id, project_slug, agent_id, lead_name, message, status, created_at, payload')
    .eq('project_slug', projectSlug)
    .order('created_at', { ascending: false })
    .limit(MAX_THREAD);
  if (error || !data) {
    if (error) console.warn('[lead-thread] lead_messages read failed', error.message);
    return memory;
  }
  const fromDb = data
    .map((row) =>
      asLeadMessage({
        id: String(row.id),
        project_slug: String(row.project_slug ?? ''),
        agent_id: row.agent_id == null ? null : String(row.agent_id),
        lead_name: row.lead_name == null ? null : String(row.lead_name),
        message: String(row.message ?? ''),
        status: String(row.status ?? ''),
        created_at: String(row.created_at ?? ''),
        payload: (row.payload ?? null) as Record<string, unknown> | null,
      }),
    )
    .filter((item): item is LeadMessage => item !== null);
  const byId = new Map<string, LeadMessage>();
  for (const item of fromDb) byId.set(item.id, item);
  for (const item of memory) byId.set(item.id, item);
  const merged = sortNewest([...byId.values()]);
  threads.set(projectSlug, merged);
  return merged;
}

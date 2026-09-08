import { ALL_LEADS, getLeadByAgentId, getLeadBySlug, type LeadContact } from '@/config/orbLeads';
import { recordLeadMessage } from '@/lib/leadThread';
import type { LeadMessage, LeadMessageStatus } from '@/types/approval';

export interface SendLeadMessageInput {
  projectSlug?: string;
  agentId?: string;
  message: string;
}

export type LeadSendStatus = 'delivered' | 'queued' | 'failed' | 'unknown';

export interface SendLeadMessageResult {
  ok: boolean;
  status: LeadSendStatus;
  demo: boolean;
  error?: string;
  reason?: string;
  lead?: LeadContact;
  record?: LeadMessage;
}

export interface LeadOutboundDeps {
  fetchImpl?: typeof fetch;
  now?: () => number;
  id?: () => string;
  persist?: (message: LeadMessage) => Promise<LeadMessage>;
}

/** Hub still owns the reverse hop: replies land via POST /api/lead-inbound, not a COMMAND pull. */
export const LEAD_INBOUND_HINT =
  'Replies appear in Message lead when the hub POSTs /api/lead-inbound. COMMAND does not pull the reverse hop.';

export function resolveLeadContact(projectSlug?: string, agentId?: string): LeadContact | undefined {
  const id = agentId?.trim();
  if (id) {
    const byId = getLeadByAgentId(id);
    if (byId) return byId;
  }
  const raw = projectSlug?.trim();
  if (!raw) return undefined;
  const slug = raw.toLowerCase().replace(/\s+/g, ' ');
  const slugBare = slug.replace(/\s+lead$/, '');
  return (
    getLeadBySlug(raw) ??
    getLeadBySlug(slug) ??
    getLeadBySlug(slugBare) ??
    ALL_LEADS.find((lead) => {
      const name = lead.leadName.toLowerCase();
      return name === slug || name === slugBare || slug === `${lead.slug} lead` || slugBare === lead.slug;
    })
  );
}

async function persistOutbound(
  lead: LeadContact,
  message: string,
  status: LeadMessageStatus,
  error: string | undefined,
  deps: LeadOutboundDeps,
): Promise<LeadMessage> {
  const record: LeadMessage = {
    id: deps.id?.() ?? crypto.randomUUID(),
    projectSlug: lead.slug,
    leadName: lead.leadName,
    agentId: lead.agentId,
    message,
    status,
    ts: deps.now?.() ?? Date.now(),
    direction: 'outbound',
    error,
  };
  const persist = deps.persist ?? recordLeadMessage;
  try {
    return await persist(record);
  } catch {
    return record;
  }
}

/**
 * Shared outbound path for Message lead UI and CEO `message_lead`.
 * Delivery is claimed only after the hub webhook returns 2xx.
 */
export async function sendLeadMessage(
  input: SendLeadMessageInput,
  deps: LeadOutboundDeps = {},
): Promise<SendLeadMessageResult> {
  const message = input.message.trim();
  if (!message) {
    return { ok: false, status: 'unknown', demo: false, error: 'Message is empty. No message was sent.' };
  }

  const lead = resolveLeadContact(input.projectSlug, input.agentId);
  if (!lead) {
    const label = input.projectSlug?.trim() || input.agentId?.trim() || 'that name';
    return {
      ok: false,
      status: 'unknown',
      demo: false,
      error: `Unknown lead (${label}). No message was sent.`,
    };
  }

  const webhook = process.env.LEAD_MESSAGE_WEBHOOK_URL;
  const secret = process.env.LEAD_MESSAGE_WEBHOOK_SECRET || process.env.GROK_BOT_API_KEY;
  const fetchImpl = deps.fetchImpl ?? fetch;

  if (!webhook) {
    const queued = await persistOutbound(lead, message, 'queued', undefined, deps);
    return {
      ok: true,
      status: 'queued',
      demo: true,
      lead,
      record: queued,
      reason: secret
        ? 'Webhook secret is set but LEAD_MESSAGE_WEBHOOK_URL is missing — queued, not delivered'
        : 'No LEAD_MESSAGE_WEBHOOK_URL — queued in the deck',
    };
  }

  const payload = {
    agentId: lead.agentId,
    message,
    projectSlug: lead.slug,
  };

  try {
    const res = await fetchImpl(webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const delivered = await persistOutbound(lead, message, 'delivered', undefined, deps);
      return { ok: true, status: 'delivered', demo: false, lead, record: delivered };
    }
    const failed = await persistOutbound(lead, message, 'failed', `Webhook returned ${res.status}`, deps);
    return { ok: false, status: 'failed', demo: false, lead, record: failed, error: failed.error };
  } catch {
    const failed = await persistOutbound(lead, message, 'failed', 'Webhook unreachable', deps);
    return { ok: false, status: 'failed', demo: false, lead, record: failed, error: failed.error };
  }
}

export function leadMessageHttpStatus(result: SendLeadMessageResult): number {
  if (result.status === 'unknown') return 404;
  if (result.status === 'failed') return 502;
  return 200;
}

export function leadMessageApiBody(result: SendLeadMessageResult) {
  if (result.status === 'unknown') {
    return { error: result.error ?? 'Unknown lead' };
  }
  return {
    status: result.status,
    demo: result.demo,
    lead: result.lead,
    id: result.record?.id,
    ts: result.record?.ts,
    reason: result.reason,
    error: result.error,
  };
}

export function formatLeadSendStatus(result: SendLeadMessageResult): string {
  if (result.status === 'unknown') {
    return `${result.error ?? 'Unknown lead. No message was sent.'} ${LEAD_INBOUND_HINT}`;
  }
  const name = result.lead?.leadName ?? 'that lead';
  if (result.status === 'delivered') {
    return `Message delivered to ${name}. ${LEAD_INBOUND_HINT}`;
  }
  if (result.status === 'queued') {
    return `Message queued for ${name} (DEMO — webhook unset). Not delivered. ${LEAD_INBOUND_HINT}`;
  }
  return `Message to ${name} failed${result.error ? ` — ${result.error}` : ''}. ${LEAD_INBOUND_HINT}`;
}

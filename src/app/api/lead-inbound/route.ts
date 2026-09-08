import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getLeadByAgentId, getLeadBySlug } from '@/config/orbLeads';
import { authorizeLeadWebhook } from '@/lib/leadAuth';
import { recordLeadMessage } from '@/lib/leadThread';

export const dynamic = 'force-dynamic';

/**
 * Hub inbound contract (Developer Bot / Grok routine after a Lead answers):
 *
 *   POST /api/lead-inbound
 *   Authorization: Bearer <LEAD_INBOUND_WEBHOOK_SECRET | LEAD_MESSAGE_WEBHOOK_SECRET>
 *   Content-Type: application/json
 *
 *   { "agentId": "<uuid>", "message": "<text>", "projectSlug": "<optional>", "leadName": "<optional>" }
 *
 * Resolve order: agentId → projectSlug. Unknown leads 404. Missing/wrong Bearer 401.
 */
const BodySchema = z
  .object({
    agentId: z.string().min(1).optional(),
    projectSlug: z.string().min(1).optional(),
    message: z.string().min(1).max(4000),
    leadName: z.string().min(1).max(120).optional(),
  })
  .refine((body) => Boolean(body.agentId || body.projectSlug), {
    message: 'agentId or projectSlug required',
  });

export async function POST(request: Request) {
  if (!authorizeLeadWebhook(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { agentId, projectSlug, message, leadName } = parsed.data;
  const lead =
    (agentId ? getLeadByAgentId(agentId) : undefined) ??
    (projectSlug ? getLeadBySlug(projectSlug) : undefined);
  if (!lead) {
    return NextResponse.json({ error: 'Unknown lead' }, { status: 404 });
  }

  const record = await recordLeadMessage({
    id: crypto.randomUUID(),
    projectSlug: lead.slug,
    leadName: leadName ?? lead.leadName,
    agentId: lead.agentId,
    message,
    status: 'received',
    ts: Date.now(),
    direction: 'inbound',
  });

  return NextResponse.json({
    status: 'received',
    id: record.id,
    ts: record.ts,
    lead: { slug: lead.slug, leadName: record.leadName, agentId: lead.agentId },
  });
}

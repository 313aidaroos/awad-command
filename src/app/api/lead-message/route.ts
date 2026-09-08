import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getLeadBySlug } from '@/config/orbLeads';
import { recordLeadMessage } from '@/lib/leadThread';
import type { LeadMessageStatus } from '@/types/approval';

const BodySchema = z.object({
  projectSlug: z.string().min(1),
  message: z.string().min(1).max(4000),
});

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const { projectSlug, message } = parsed.data;
  const lead = getLeadBySlug(projectSlug);
  if (!lead) {
    return NextResponse.json({ error: 'Unknown lead' }, { status: 404 });
  }

  const webhook = process.env.LEAD_MESSAGE_WEBHOOK_URL;
  const secret = process.env.LEAD_MESSAGE_WEBHOOK_SECRET || process.env.GROK_BOT_API_KEY;

  if (!webhook) {
    const queued = await persistOutbound(lead, message, 'queued');
    return NextResponse.json({
      status: 'queued',
      demo: true,
      lead,
      id: queued.id,
      ts: queued.ts,
      reason: secret
        ? 'Webhook secret is set but LEAD_MESSAGE_WEBHOOK_URL is missing — queued, not delivered'
        : 'No LEAD_MESSAGE_WEBHOOK_URL — queued in the deck',
    });
  }

  // Hub-locked body — no extra fields.
  const payload = {
    agentId: lead.agentId,
    message,
    projectSlug,
  };

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Hub contract: one auth header — Authorization: Bearer <LEAD_MESSAGE_WEBHOOK_SECRET>
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const delivered = await persistOutbound(lead, message, 'delivered');
      return NextResponse.json({ status: 'delivered', lead, demo: false, id: delivered.id, ts: delivered.ts });
    }
    const failed = await persistOutbound(lead, message, 'failed', `Webhook returned ${res.status}`);
    return NextResponse.json(
      {
        status: 'failed',
        lead,
        id: failed.id,
        ts: failed.ts,
        error: failed.error,
      },
      { status: 502 },
    );
  } catch {
    const failed = await persistOutbound(lead, message, 'failed', 'Webhook unreachable');
    return NextResponse.json(
      { status: 'failed', lead, id: failed.id, ts: failed.ts, error: failed.error },
      { status: 502 },
    );
  }
}

async function persistOutbound(
  lead: NonNullable<ReturnType<typeof getLeadBySlug>>,
  message: string,
  status: LeadMessageStatus,
  error?: string,
) {
  const record = {
    id: crypto.randomUUID(),
    projectSlug: lead.slug,
    leadName: lead.leadName,
    agentId: lead.agentId,
    message,
    status,
    ts: Date.now(),
    direction: 'outbound' as const,
    error,
  };
  try {
    return await recordLeadMessage(record);
  } catch {
    return record;
  }
}

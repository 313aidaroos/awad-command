import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getLeadBySlug } from '@/config/orbLeads';

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
    return NextResponse.json({
      status: 'queued',
      demo: true,
      lead,
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
      return NextResponse.json({ status: 'delivered', lead, demo: false });
    }
    return NextResponse.json(
      {
        status: 'failed',
        lead,
        error: `Webhook returned ${res.status}`,
      },
      { status: 502 },
    );
  } catch {
    return NextResponse.json(
      { status: 'failed', lead, error: 'Webhook unreachable' },
      { status: 502 },
    );
  }
}

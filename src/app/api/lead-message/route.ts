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
  if (!lead || lead.kind !== 'product') {
    return NextResponse.json({ error: 'Unknown project lead' }, { status: 404 });
  }

  const webhook = process.env.LEAD_MESSAGE_WEBHOOK_URL;
  const apiKey = process.env.GROK_BOT_API_KEY;
  const secret = process.env.LEAD_MESSAGE_WEBHOOK_SECRET;

  if (!webhook) {
    return NextResponse.json({
      status: 'queued',
      demo: true,
      lead,
      reason: secret || apiKey
        ? 'Lead webhook auth is set but LEAD_MESSAGE_WEBHOOK_URL is missing — queued, not delivered'
        : 'No LEAD_MESSAGE_WEBHOOK_URL — queued in the deck',
    });
  }

  const payload = {
    projectSlug,
    agentId: lead.agentId,
    leadName: lead.leadName,
    message,
    comingSoon: Boolean(lead.comingSoon),
  };

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        ...(secret ? { 'X-Webhook-Secret': secret } : {}),
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

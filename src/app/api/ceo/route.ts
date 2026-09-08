import { NextResponse } from 'next/server';
import { z } from 'zod';
import { buildContext } from '@/ceo/buildContext';
import { demoResponder } from '@/ceo/demoResponder';
import { isAnthropicCeoEnabled } from '@/lib/env';
import type { CommandState } from '@/store/types';

const ContextSchema = z.object({
  dataMode: z.enum(['demo', 'live']),
  projects: z.record(z.any()),
  agents: z.record(z.any()),
  events: z.object({ buffer: z.array(z.any()), unread: z.number() }),
  approvals: z.array(z.any()),
});

const BodySchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    }),
  ),
  context: ContextSchema,
});

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const { messages, context } = parsed.data;
  const last = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
  const snapshot = context as Pick<CommandState, 'dataMode' | 'projects' | 'agents' | 'events' | 'approvals'>;

  if (!isAnthropicCeoEnabled()) {
    const answer = demoResponder(last, snapshot);
    return NextResponse.json({ text: answer.text, approval: answer.approval, provider: 'demo' });
  }

  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
  const completion = await client.messages.create({
    model,
    max_tokens: 800,
    system: `You are AWAD CEO, the executive AI over Awad's businesses. Answer from the snapshot only; if the snapshot is demo data, say so briefly once and never present figures as real. Be concise, numeric, decisive. You can name which Lead bot owns a company from the lead map. Never claim a spend, publish, delete, or live trade happened.`,
    messages: [
      { role: 'user', content: `Snapshot:\n${buildContext(snapshot)}` },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  });
  const text = completion.content
    .filter((block) => block.type === 'text')
    .map((block) => ('text' in block ? block.text : ''))
    .join('\n');
  const extra = demoResponder(last, snapshot);
  return NextResponse.json({
    text: text || extra.text,
    approval: extra.approval,
    provider: 'anthropic',
  });
}

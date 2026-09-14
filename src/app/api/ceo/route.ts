import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runCeoTurn } from '@/ceo/runCeoTurn';

export const runtime = 'nodejs';

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
  const result = await runCeoTurn(parsed.data);
  return NextResponse.json(result);
}

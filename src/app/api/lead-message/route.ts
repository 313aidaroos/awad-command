import { NextResponse } from 'next/server';
import { z } from 'zod';
import { leadMessageApiBody, leadMessageHttpStatus, sendLeadMessage } from '@/lib/leadOutbound';

const BodySchema = z.object({
  projectSlug: z.string().min(1),
  message: z.string().min(1).max(4000),
});

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const result = await sendLeadMessage(parsed.data);
  return NextResponse.json(leadMessageApiBody(result), { status: leadMessageHttpStatus(result) });
}

import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { runDailyHostAutomation } from '@/daily-host/service';

export const runtime = 'nodejs';
export const maxDuration = 60;

function equal(left: string, right: string) {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(left), digest(right));
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!secret || !token || !equal(secret, token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json(await runDailyHostAutomation('cron'));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Automation failed.' },
      { status: 500 },
    );
  }
}

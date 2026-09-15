import { NextResponse } from 'next/server';
import { persistComputerHalt } from '@/lib/computerControl';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let workerId = '*';
  try {
    const body = (await request.json()) as { workerId?: string };
    if (typeof body.workerId === 'string' && body.workerId.trim()) workerId = body.workerId.trim();
  } catch {
    workerId = '*';
  }
  const result = await persistComputerHalt(workerId);
  const status = result.ok ? 200 : 500;
  return NextResponse.json(result, { status });
}

import { NextResponse } from 'next/server';
import { readComputerStatus } from '@/lib/computerControl';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectSlug = url.searchParams.get('project')?.trim() || undefined;
  const status = await readComputerStatus(projectSlug);
  return NextResponse.json(status);
}

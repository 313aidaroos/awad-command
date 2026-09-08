import { NextResponse } from 'next/server';
import { getLeadByAgentId, getLeadBySlug } from '@/config/orbLeads';
import { loadLeadThread } from '@/lib/leadThread';

export const dynamic = 'force-dynamic';

/** Deck poll: GET /api/lead-thread?projectSlug=contraxis (or agentId). No webhook secret. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectSlug = url.searchParams.get('projectSlug')?.trim() ?? '';
  const agentId = url.searchParams.get('agentId')?.trim() ?? '';

  const lead =
    (projectSlug ? getLeadBySlug(projectSlug) : undefined) ??
    (agentId ? getLeadByAgentId(agentId) : undefined);
  if (!lead) {
    return NextResponse.json({ error: 'Unknown lead' }, { status: 404 });
  }

  const messages = await loadLeadThread(lead.slug);
  return NextResponse.json(
    { projectSlug: lead.slug, agentId: lead.agentId, messages },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

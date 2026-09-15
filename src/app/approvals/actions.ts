'use server';

import { persistApprovalResolution, type ResolveApprovalResult } from '@/lib/agentTasks';

export async function resolveApprovalAction(
  approvalId: string,
  decision: 'approved' | 'denied',
): Promise<ResolveApprovalResult> {
  if (!approvalId.trim()) {
    return { ok: false, demo: false, approvalId, decision, error: 'Missing approval id' };
  }
  if (decision !== 'approved' && decision !== 'denied') {
    return { ok: false, demo: false, approvalId, decision: 'denied', error: 'Invalid decision' };
  }
  return persistApprovalResolution(approvalId, decision, { resolvedBy: 'Awad' });
}

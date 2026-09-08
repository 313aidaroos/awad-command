export type ApprovalKind = 'deploy' | 'campaign' | 'financial' | 'other';
export type ApprovalRisk = 'low' | 'medium' | 'high';
export type ApprovalStatus = 'pending' | 'approved' | 'denied';

export interface Approval {
  id: string;
  title: string;
  description: string;
  kind: ApprovalKind;
  risk: ApprovalRisk;
  status: ApprovalStatus;
  createdAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
}

export interface LeadMessage {
  id: string;
  projectSlug: string;
  leadName: string;
  agentId: string;
  message: string;
  status: 'queued' | 'delivered' | 'failed';
  ts: number;
  error?: string;
}

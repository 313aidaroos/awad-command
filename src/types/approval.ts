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
  taskId?: string;
  persisted?: boolean;
}

export type LeadMessageDirection = 'outbound' | 'inbound';
export type LeadMessageStatus = 'queued' | 'delivered' | 'failed' | 'received';

export interface LeadMessage {
  id: string;
  projectSlug: string;
  leadName: string;
  agentId: string;
  message: string;
  status: LeadMessageStatus;
  ts: number;
  error?: string;
  /** Defaults to outbound when omitted (older client records). */
  direction?: LeadMessageDirection;
}

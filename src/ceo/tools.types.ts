import type { ContextPanel, ModeName } from '@/store/types';
import type { LeadMessage } from '@/types/approval';

export interface ProposeApprovalArgs {
  title: string;
  description: string;
  kind: 'deploy' | 'campaign' | 'financial' | 'other';
  risk: 'low' | 'medium' | 'high';
}

export type CeoLeadSendStatus = 'delivered' | 'queued' | 'failed' | 'unknown';

export type CeoClientAction =
  | { name: 'navigate'; project?: string; agent?: string; mode?: ModeName }
  | { name: 'open_panel'; kind: ContextPanel }
  | { name: 'propose_approval'; args: ProposeApprovalArgs }
  | {
      name: 'message_lead';
      projectSlug?: string;
      leadName?: string;
      status: CeoLeadSendStatus;
      demo?: boolean;
      error?: string;
      record?: LeadMessage;
    };

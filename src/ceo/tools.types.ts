import type { ContextPanel, ModeName } from '@/store/types';
import type { LeadMessage } from '@/types/approval';

export interface ProposeApprovalArgs {
  title: string;
  description: string;
  kind: 'deploy' | 'campaign' | 'financial' | 'other';
  risk: 'low' | 'medium' | 'high';
}

export type CeoLeadSendStatus = 'delivered' | 'queued' | 'failed' | 'unknown';

export interface CreateTaskArgs {
  agentId: string;
  instruction: string;
  title: string;
  requiresApproval: boolean;
  risk: 'low' | 'medium' | 'high';
  kind?: ProposeApprovalArgs['kind'];
}

export type CeoClientAction =
  | { name: 'navigate'; project?: string; agent?: string; mode?: ModeName }
  | { name: 'open_panel'; kind: ContextPanel }
  | { name: 'propose_approval'; args: ProposeApprovalArgs }
  | {
      name: 'create_task';
      taskId: string;
      agentId: string;
      projectSlug: string;
      demo: boolean;
      requiresApproval: boolean;
      approval?: ProposeApprovalArgs & { id: string; taskId: string };
    }
  | {
      name: 'message_lead';
      projectSlug?: string;
      leadName?: string;
      status: CeoLeadSendStatus;
      demo?: boolean;
      error?: string;
      record?: LeadMessage;
    }
  | {
      name: 'email_draft';
      accountId: string;
      account: string;
      provider: 'google' | 'microsoft';
      draftId: string;
      to: string;
      subject: string;
      body: string;
    };

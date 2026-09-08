import type { Tool } from '@anthropic-ai/sdk/resources/messages/messages';
import { getProject } from '@/projects/registry';
import { formatLeadSendStatus, sendLeadMessage, type LeadOutboundDeps, type SendLeadMessageResult } from '@/lib/leadOutbound';
import type { CeoClientAction, ProposeApprovalArgs } from '@/ceo/tools.types';
import type { ContextPanel, ModeName } from '@/store/types';

export type { CeoClientAction, ProposeApprovalArgs } from '@/ceo/tools.types';

const PANELS: ContextPanel[] = ['none', 'agent', 'analytics', 'briefing', 'approval', 'computer', 'lead'];
const MODES: ModeName[] = ['default', 'economy', 'workforce', 'analytics'];
const APPROVAL_KINDS = ['deploy', 'campaign', 'financial', 'other'] as const;
const RISKS = ['low', 'medium', 'high'] as const;

export const CEO_SYSTEM_PROMPT = `You are AWAD CEO, the executive AI over Awad's businesses. Answer from the snapshot only; if the snapshot is demo data, say so briefly once and never present figures as real. Be concise, numeric, decisive.

Tools:
- message_lead — send a real message to a product Lead through the same hub pipe as Message lead. Use when Awad asks you to tell, ask, ping, or message a Lead. Pass projectSlug (orb slug or lead name) or agentId, plus the message text.
- navigate — fly the camera to a project, agent, or mode. UI only.
- open_panel — open a HUD panel. UI only.
- propose_approval — create a record-only approval card. Does not spend, publish, delete, or trade.

Hard rules:
- NEVER claim a spend, publish, delete, or live trade happened. Approvals stay record-only.
- After message_lead, report the tool result honestly (delivered, queued/DEMO, or failed). Never invent success.
- Unknown slug or agentId: say you could not find that lead and that nothing was sent.
- Lead replies do not arrive in this chat. The hub still owns the reverse hop — replies appear in Message lead only after the hub POSTs /api/lead-inbound.
- You can name which Lead bot owns a company from the lead map.`;

export const CEO_ANTHROPIC_TOOLS: Tool[] = [
  {
    name: 'message_lead',
    description:
      'Send a real outbound message to a product or system Lead via the hub webhook. Replies are not fetched here; the hub POSTs /api/lead-inbound into Message lead.',
    input_schema: {
      type: 'object',
      properties: {
        projectSlug: { type: 'string', description: 'Orb slug (contraxis) or lead name (Contraxis Lead).' },
        agentId: { type: 'string', description: 'Lead agent UUID from the orb map.' },
        message: { type: 'string', description: 'Plain text to deliver to the Lead.' },
      },
      required: ['message'],
    },
  },
  {
    name: 'navigate',
    description: 'Fly the camera to a project, agent, or mode. Never executes business actions.',
    input_schema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project slug to enter.' },
        agent: { type: 'string', description: 'Agent id to focus.' },
        mode: { type: 'string', enum: MODES, description: 'Universe mode.' },
      },
    },
  },
  {
    name: 'open_panel',
    description: 'Open a HUD panel: agent, analytics, briefing, approval, computer, lead.',
    input_schema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: PANELS },
      },
      required: ['kind'],
    },
  },
  {
    name: 'propose_approval',
    description: 'Create a record-only approval card. Does not spend, publish, delete, or trade.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        kind: { type: 'string', enum: [...APPROVAL_KINDS] },
        risk: { type: 'string', enum: [...RISKS] },
      },
      required: ['title', 'description', 'kind', 'risk'],
    },
  },
];

/** Kept for callers that only need names. Prefer CEO_ANTHROPIC_TOOLS. */
export const ceoTools = CEO_ANTHROPIC_TOOLS.map(({ name, description }) => ({ name, description }));

export interface CeoToolExecution {
  forModel: Record<string, unknown>;
  clientActions: CeoClientAction[];
  approval?: ProposeApprovalArgs;
  leadResult?: SendLeadMessageResult;
}

export interface CeoToolDeps {
  sendLead?: typeof sendLeadMessage;
  outbound?: LeadOutboundDeps;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export async function executeCeoTool(
  call: { name: string; input: Record<string, unknown> },
  deps: CeoToolDeps = {},
): Promise<CeoToolExecution> {
  const send = deps.sendLead ?? ((input) => sendLeadMessage(input, deps.outbound));

  if (call.name === 'message_lead') {
    const result = await send({
      projectSlug: asString(call.input.projectSlug),
      agentId: asString(call.input.agentId),
      message: asString(call.input.message) ?? '',
    });
    return {
      forModel: {
        status: result.status,
        demo: result.demo,
        ok: result.ok,
        leadName: result.lead?.leadName,
        projectSlug: result.lead?.slug,
        error: result.error,
        reason: result.reason,
        inbound:
          'Replies appear in Message lead only after the hub POSTs /api/lead-inbound. COMMAND does not pull the reverse hop.',
      },
      clientActions: [
        {
          name: 'message_lead',
          projectSlug: result.lead?.slug,
          leadName: result.lead?.leadName,
          status: result.status,
          demo: result.demo,
          error: result.error,
          record: result.record,
        },
      ],
      leadResult: result,
    };
  }

  if (call.name === 'navigate') {
    const project = asString(call.input.project);
    const agent = asString(call.input.agent);
    const modeRaw = asString(call.input.mode);
    const mode = modeRaw && MODES.includes(modeRaw as ModeName) ? (modeRaw as ModeName) : undefined;
    if (project && !getProject(project)) {
      return { forModel: { error: `Unknown project ${project}` }, clientActions: [] };
    }
    return {
      forModel: { ok: true, project, agent, mode },
      clientActions: [{ name: 'navigate', project, agent, mode }],
    };
  }

  if (call.name === 'open_panel') {
    const kind = asString(call.input.kind);
    if (!kind || !PANELS.includes(kind as ContextPanel)) {
      return { forModel: { error: 'Unknown panel' }, clientActions: [] };
    }
    return {
      forModel: { ok: true, kind },
      clientActions: [{ name: 'open_panel', kind: kind as ContextPanel }],
    };
  }

  if (call.name === 'propose_approval') {
    const title = asString(call.input.title);
    const description = asString(call.input.description);
    const kind = asString(call.input.kind);
    const risk = asString(call.input.risk);
    if (
      !title ||
      !description ||
      !kind ||
      !risk ||
      !APPROVAL_KINDS.includes(kind as (typeof APPROVAL_KINDS)[number]) ||
      !RISKS.includes(risk as (typeof RISKS)[number])
    ) {
      return { forModel: { error: 'Invalid approval args' }, clientActions: [] };
    }
    const args: ProposeApprovalArgs = {
      title,
      description,
      kind: kind as ProposeApprovalArgs['kind'],
      risk: risk as ProposeApprovalArgs['risk'],
    };
    return {
      forModel: { ok: true, recordOnly: true, ...args },
      clientActions: [{ name: 'propose_approval', args }],
      approval: args,
    };
  }

  return { forModel: { error: `Unknown tool ${call.name}` }, clientActions: [] };
}

export function composeCeoText(modelText: string, leadResults: SendLeadMessageResult[]): string {
  const statuses = leadResults.map(formatLeadSendStatus);
  const body = modelText.trim();
  if (statuses.length === 0) return body;
  const claimedDelivered = /delivered|sent successfully|message (?:was )?sent\b/i.test(body);
  const failed = leadResults.some((result) => result.status === 'unknown' || result.status === 'failed');
  if (failed && claimedDelivered) return statuses.join('\n\n');
  return [body, ...statuses].filter(Boolean).join('\n\n');
}

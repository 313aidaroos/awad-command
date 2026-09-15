import { buildContext } from '@/ceo/buildContext';
import { demoResponder } from '@/ceo/demoResponder';
import { composeLeadOutboundMessage, parseLeadDirective } from '@/ceo/leadDirective';
import {
  CEO_ANTHROPIC_TOOLS,
  CEO_SYSTEM_PROMPT,
  composeCeoText,
  executeCeoTool,
  type CeoToolDeps,
} from '@/ceo/tools';
import type { CeoClientAction, ProposeApprovalArgs } from '@/ceo/tools.types';
import { anthropicApiKey, anthropicModel, isAnthropicCeoEnabled } from '@/lib/env';
import type { CreatedTask } from '@/lib/agentTasks';
import type { SendLeadMessageResult } from '@/lib/leadOutbound';
import type { CommandState } from '@/store/types';

export type CeoSnapshot = Pick<CommandState, 'dataMode' | 'projects' | 'agents' | 'events' | 'approvals'>;

export interface CeoChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CeoTurnInput {
  messages: CeoChatMessage[];
  context: CeoSnapshot;
}

export type CeoProvider = 'anthropic' | 'demo' | 'error';

export interface CeoTurnResult {
  text: string;
  provider: CeoProvider;
  error?: string;
  approval?: ProposeApprovalArgs;
  actions: CeoClientAction[];
}

type AnthropicContent =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };

export interface AnthropicLike {
  messages: {
    create: (args: {
      model: string;
      max_tokens: number;
      system: string;
      tools: typeof CEO_ANTHROPIC_TOOLS;
      messages: Array<{ role: 'user' | 'assistant'; content: unknown }>;
    }) => Promise<{
      content: AnthropicContent[];
      stop_reason: string | null;
    }>;
  };
}

export interface CeoTurnDeps extends CeoToolDeps {
  client?: AnthropicLike;
}

const MAX_TOOL_ROUNDS = 4;

function lastUserText(messages: CeoChatMessage[]): string {
  return [...messages].reverse().find((item) => item.role === 'user')?.content ?? '';
}

async function runToolCalls(
  calls: Array<{ name: string; input: Record<string, unknown> }>,
  deps: CeoTurnDeps,
): Promise<{
  actions: CeoClientAction[];
  approval?: ProposeApprovalArgs;
  leadResults: SendLeadMessageResult[];
  tasks: CreatedTask[];
  forModel: Array<{ name: string; payload: Record<string, unknown> }>;
}> {
  const actions: CeoClientAction[] = [];
  const leadResults: SendLeadMessageResult[] = [];
  const tasks: CreatedTask[] = [];
  const forModel: Array<{ name: string; payload: Record<string, unknown> }> = [];
  let approval: ProposeApprovalArgs | undefined;
  for (const call of calls) {
    const executed = await executeCeoTool(call, deps);
    actions.push(...executed.clientActions);
    if (executed.approval) approval = executed.approval;
    if (executed.leadResult) leadResults.push(executed.leadResult);
    if (executed.task) tasks.push(executed.task);
    forModel.push({ name: call.name, payload: executed.forModel });
  }
  return { actions, approval, leadResults, tasks, forModel };
}

export async function runDemoCeoTurn(input: CeoTurnInput, deps: CeoTurnDeps = {}): Promise<CeoTurnResult> {
  const last = lastUserText(input.messages);
  const answer = demoResponder(last, input.context);
  const directive = parseLeadDirective(last);
  const toolCalls = [...(answer.toolCalls ?? [])];
  if (directive && !toolCalls.some((call) => call.name === 'message_lead')) {
    toolCalls.push({
      name: 'message_lead',
      input: {
        projectSlug: directive.target,
        message: composeLeadOutboundMessage(directive.message),
      },
    });
  }
  const executed = await runToolCalls(toolCalls, deps);
  return {
    text: composeCeoText(answer.text, executed.leadResults, executed.tasks),
    provider: 'demo',
    approval: executed.approval ?? answer.approval,
    actions: executed.actions,
  };
}

async function createAnthropicClient(): Promise<AnthropicLike> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  return new Anthropic({ apiKey: anthropicApiKey() }) as unknown as AnthropicLike;
}

function anthropicFailure(err: unknown): CeoTurnResult {
  const detail = err instanceof Error && err.message.trim() ? err.message.trim() : 'unknown error';
  const error = `Anthropic CEO request failed: ${detail}`;
  return {
    text: error,
    provider: 'error',
    error,
    actions: [],
  };
}

export async function runAnthropicCeoTurn(
  input: CeoTurnInput,
  client: AnthropicLike,
  deps: CeoTurnDeps = {},
): Promise<CeoTurnResult> {
  const model = anthropicModel();
  const messages: Array<{ role: 'user' | 'assistant'; content: unknown }> = [
    { role: 'user', content: `Snapshot:\n${buildContext(input.context)}` },
    ...input.messages.map((item) => ({ role: item.role, content: item.content })),
  ];

  const actions: CeoClientAction[] = [];
  const leadResults: SendLeadMessageResult[] = [];
  const tasks: CreatedTask[] = [];
  let approval: ProposeApprovalArgs | undefined;
  let text = '';

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const completion = await client.messages.create({
      model,
      max_tokens: 800,
      system: CEO_SYSTEM_PROMPT,
      tools: CEO_ANTHROPIC_TOOLS,
      messages,
    });

    text = completion.content
      .filter((block): block is Extract<AnthropicContent, { type: 'text' }> => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    const toolUses = completion.content.filter(
      (block): block is Extract<AnthropicContent, { type: 'tool_use' }> => block.type === 'tool_use',
    );

    if (completion.stop_reason !== 'tool_use' || toolUses.length === 0) {
      break;
    }

    messages.push({ role: 'assistant', content: completion.content });
    const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = [];
    for (const tool of toolUses) {
      const input = tool.input && typeof tool.input === 'object' ? tool.input : {};
      const executed = await executeCeoTool({ name: tool.name, input }, deps);
      actions.push(...executed.clientActions);
      if (executed.approval) approval = executed.approval;
      if (executed.leadResult) leadResults.push(executed.leadResult);
      if (executed.task) tasks.push(executed.task);
      toolResults.push({
        type: 'tool_result',
        tool_use_id: tool.id,
        content: JSON.stringify(executed.forModel),
      });
    }
    messages.push({ role: 'user', content: toolResults });
  }

  return {
    text: composeCeoText(text, leadResults, tasks),
    provider: 'anthropic',
    approval,
    actions,
  };
}

export async function runCeoTurn(input: CeoTurnInput, deps: CeoTurnDeps = {}): Promise<CeoTurnResult> {
  if (deps.client || isAnthropicCeoEnabled()) {
    try {
      const client = deps.client ?? (await createAnthropicClient());
      return await runAnthropicCeoTurn(input, client, deps);
    } catch (err) {
      return anthropicFailure(err);
    }
  }
  return runDemoCeoTurn(input, deps);
}

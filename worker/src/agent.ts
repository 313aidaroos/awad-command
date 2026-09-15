import type { WorkerDb } from './db.js';
import { log, logError } from './log.js';
import { costUsd } from './pricing.js';
import { createToolRegistry, ToolGuardError, type ToolContext } from './tools/index.js';
import { asNumber, type TaskRow } from './types.js';

export interface AnthropicUsage {
  input_tokens?: number;
  output_tokens?: number;
}

export type AnthropicContent =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };

export interface AnthropicLike {
  messages: {
    create: (args: {
      model: string;
      max_tokens: number;
      system: string;
      tools: Array<{ name: string; description: string; input_schema: Record<string, unknown> }>;
      messages: Array<{ role: 'user' | 'assistant'; content: unknown }>;
    }) => Promise<{ content: AnthropicContent[]; stop_reason: string | null; usage?: AnthropicUsage }>;
  };
}

export interface AgentDeps {
  db: WorkerDb;
  client: AnthropicLike;
  model: string;
  maxSteps: number;
  registry?: ReturnType<typeof createToolRegistry>;
}

function instructionOf(task: TaskRow): string {
  return (task.instruction ?? '').trim() || task.title;
}

export function buildAgentSystemPrompt(input: {
  agentName?: string | null;
  role?: string | null;
  objective?: string | null;
  tools?: string[] | null;
  projectName?: string | null;
  projectStatus?: string | null;
  memory?: Record<string, unknown> | null;
}): string {
  const tools = (input.tools ?? []).join(', ') || 'supabase.query, http.fetch';
  const memory =
    input.memory && Object.keys(input.memory).length > 0 ? JSON.stringify(input.memory).slice(0, 4000) : 'none';
  return [
    `You are ${input.agentName ?? 'an AWAD agent'}${input.role ? `, role ${input.role}` : ''}.`,
    input.objective ? `Objective: ${input.objective}` : '',
    `Project: ${input.projectName ?? 'unknown'} (${input.projectStatus ?? 'unknown'}).`,
    `Allowed tools: ${tools}. First tools available now: supabase.query (whitelist views) and http.fetch (public GET).`,
    'Hard rules: never spend, publish, delete, or trade. Money or destructive tools will be refused unless an approval is already approved.',
    'Work from evidence. When you finish, write a short plain-English report: what you did, what changed, what to do next.',
    `Memory: ${memory}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function runTask(task: TaskRow, deps: AgentDeps): Promise<void> {
  const registry = deps.registry ?? createToolRegistry();
  const agent = await deps.db.getAgent(task.agent_id);
  const project = agent ? await deps.db.getProject(agent.project_slug) : null;
  const approval = task.approval_id ? await deps.db.getApproval(task.approval_id) : null;
  const projectSlug = agent?.project_slug ?? null;
  const startedAt = new Date().toISOString();

  await deps.db.updateTask(task.id, { status: 'running', started_at: startedAt });
  await deps.db.insertEvent({
    type: 'agent.task.started',
    project_slug: projectSlug,
    agent_id: task.agent_id,
    summary: `Started: ${task.title}`,
    payload: { task_id: task.id },
  });

  const ctx: ToolContext = { task, approval, db: deps.db };
  const messages: Array<{ role: 'user' | 'assistant'; content: unknown }> = [
    { role: 'user', content: instructionOf(task) },
  ];
  const system = buildAgentSystemPrompt({
    agentName: agent?.name,
    role: agent?.role,
    objective: agent?.objective,
    tools: agent?.tools,
    projectName: project?.name,
    projectStatus: project?.status,
    memory: agent?.memory,
  });

  let spent = asNumber(task.spent_usd);
  const budget = asNumber(task.budget_usd, 0.5);
  let report = '';
  const steps: Array<{ name: string; summary: string }> = [];

  try {
    for (let step = 0; step < deps.maxSteps; step += 1) {
      if (spent >= budget) {
        throw new Error(`Budget exceeded ($${spent.toFixed(4)} / $${budget})`);
      }

      const completion = await deps.client.messages.create({
        model: deps.model,
        max_tokens: 1200,
        system,
        tools: registry.anthropicTools(),
        messages,
      });
      spent += costUsd(deps.model, completion.usage?.input_tokens ?? 0, completion.usage?.output_tokens ?? 0);
      await deps.db.updateTask(task.id, { spent_usd: spent });

      const text = completion.content
        .filter((block): block is Extract<AnthropicContent, { type: 'text' }> => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
        .trim();
      if (text) report = text;

      const toolUses = completion.content.filter(
        (block): block is Extract<AnthropicContent, { type: 'tool_use' }> => block.type === 'tool_use',
      );

      if (completion.stop_reason !== 'tool_use' || toolUses.length === 0) {
        await deps.db.insertEvent({
          type: 'agent.step',
          project_slug: projectSlug,
          agent_id: task.agent_id,
          summary: text.slice(0, 180) || `Step ${step + 1} complete`,
          payload: { task_id: task.id, step, spent_usd: spent },
        });
        break;
      }

      messages.push({ role: 'assistant', content: completion.content });
      const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = [];
      for (const call of toolUses) {
        const input = call.input && typeof call.input === 'object' ? call.input : {};
        let payload: unknown;
        try {
          payload = await registry.execute(call.name, input, ctx);
        } catch (err) {
          payload = {
            error: err instanceof ToolGuardError || err instanceof Error ? err.message : 'tool failed',
          };
        }
        const summary = `${call.name}: ${JSON.stringify(payload).slice(0, 140)}`;
        steps.push({ name: call.name, summary });
        await deps.db.insertEvent({
          type: 'agent.step',
          project_slug: projectSlug,
          agent_id: task.agent_id,
          summary,
          payload: { task_id: task.id, step, tool: call.name },
        });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: call.id,
          content: JSON.stringify(payload).slice(0, 12_000),
        });
      }
      messages.push({ role: 'user', content: toolResults });
    }

    const finalReport = report || `Completed ${task.title} in ${steps.length} tool steps.`;
    await deps.db.updateTask(task.id, {
      status: 'done',
      completed_at: new Date().toISOString(),
      report: finalReport,
      spent_usd: spent,
      result: { steps, spent_usd: spent },
      error: null,
    });
    await deps.db.insertEvent({
      type: 'agent.task.completed',
      project_slug: projectSlug,
      agent_id: task.agent_id,
      summary: finalReport.slice(0, 240),
      payload: { task_id: task.id, spent_usd: spent },
    });
    log('task.done', { taskId: task.id, spent });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logError('task.failed', err, { taskId: task.id });
    await deps.db.updateTask(task.id, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      error: message,
      report: report || `Failed: ${message}`,
      spent_usd: spent,
    });
    await deps.db.insertEvent({
      type: 'system.error',
      project_slug: projectSlug,
      agent_id: task.agent_id,
      summary: `Task failed: ${message}`,
      payload: { task_id: task.id },
    });
  }
}

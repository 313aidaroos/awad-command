import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ANTHROPIC_TOOL_NAME } from './anthropicToolNames.js';
import { buildAgentSystemPrompt, runTask, type AnthropicLike } from './agent.js';
import type { WorkerDb } from './db.js';
import { computerTools, createFakeRuntime } from './tools/computer/index.js';
import { createToolRegistry } from './tools/index.js';
import type { TaskRow } from './types.js';

function task(patch: Partial<TaskRow> = {}): TaskRow {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    created_at: '2026-01-01T00:00:00Z',
    agent_id: 'contraxis.analytics-agent',
    title: "Summarise today's leads",
    instruction: "Summarise today's leads and conversion",
    status: 'claimed',
    source: 'ceo',
    created_by: 'ceo',
    started_at: null,
    completed_at: null,
    result: null,
    error: null,
    report: null,
    lease_until: null,
    worker_id: 'w1',
    claimed_at: '2026-01-01T00:00:00Z',
    budget_usd: 0.5,
    spent_usd: 0,
    approval_id: null,
    ...patch,
  };
}

function memoryDb() {
  const events: unknown[] = [];
  const patches: Array<{ id: string; patch: import('./types.js').TaskPatch }> = [];
  const db: WorkerDb = {
    claimTask: async () => null,
    updateTask: async (id, patch) => {
      patches.push({ id, patch });
    },
    insertEvent: async (event) => {
      events.push(event);
    },
    heartbeat: async () => undefined,
    releaseTask: async () => undefined,
    getApproval: async () => null,
    getAgent: async () => ({
      id: 'contraxis.analytics-agent',
      project_slug: 'contraxis',
      name: 'Analytics Agent',
      role: 'Analytics',
      objective: 'Conversion truth',
      tools: ['metrics'],
      memory: {},
    }),
    getProject: async () => ({ slug: 'contraxis', name: 'CONTRAXIS', status: 'operational' }),
    queryView: async () => [{ project_slug: 'contraxis', value: 3 }],
    getWorkerStatus: async () => null,
    insertApproval: async () => ({ id: 'apr', status: 'pending' }),
    recordScreen: async () => ({ screenshot_url: null, storage_path: 'x.png' }),
    uploadScreenshot: async (path) => ({ path }),
  };
  return { db, events, patches };
}

describe('runTask', () => {
  it('builds a system prompt from the agent row', () => {
    const prompt = buildAgentSystemPrompt({
      agentName: 'Analytics Agent',
      role: 'Analytics',
      objective: 'Conversion truth',
      projectName: 'CONTRAXIS',
      projectStatus: 'operational',
    });
    expect(prompt).toMatch(/Analytics Agent/);
    expect(prompt).toMatch(/never spend/i);
    expect(prompt).toMatch(/CONTRAXIS/);
    expect(prompt).toMatch(/personal logins/i);
  });

  it('cancels the task when the worker is halted', async () => {
    const { db, patches } = memoryDb();
    db.getWorkerStatus = async () => ({ status: 'halt', detail: { halted: true } });
    const client: AnthropicLike = {
      messages: {
        create: async () => {
          throw new Error('should not be called');
        },
      },
    };
    await runTask(task(), { db, client, model: 'claude-sonnet-5', maxSteps: 2, workerId: 'w1' });
    expect(patches.some((p) => p.patch.status === 'cancelled' && p.patch.error === 'halted')).toBe(true);
  });

  it('writes started/step/completed events and a report', async () => {
    const { db, events, patches } = memoryDb();
    let round = 0;
    const sentNames: string[] = [];
    const client: AnthropicLike = {
      messages: {
        create: async (args) => {
          sentNames.push(...args.tools.map((tool) => tool.name));
          round += 1;
          if (round === 1) {
            return {
              stop_reason: 'tool_use',
              usage: { input_tokens: 10, output_tokens: 5 },
              content: [
                {
                  type: 'tool_use',
                  id: 'tu1',
                  name: 'supabase_query',
                  input: { view: 'v_leads', projectSlug: 'contraxis' },
                },
              ],
            };
          }
          return {
            stop_reason: 'end_turn',
            usage: { input_tokens: 8, output_tokens: 20 },
            content: [{ type: 'text', text: '3 leads today; conversion is quiet.' }],
          };
        },
      },
    };

    await runTask(task(), { db, client, model: 'claude-sonnet-5', maxSteps: 5 });

    expect(sentNames.every((name) => ANTHROPIC_TOOL_NAME.test(name) && !name.includes('.'))).toBe(true);
    expect(sentNames).toContain('supabase_query');
    expect(events.map((e) => (e as { type: string }).type)).toEqual([
      'agent.task.started',
      'agent.step',
      'agent.step',
      'agent.task.completed',
    ]);
    const step = events.find(
      (e) => (e as { type: string; payload?: { tool?: string } }).type === 'agent.step' && (e as { payload?: { tool?: string } }).payload?.tool,
    ) as { payload?: { tool?: string }; summary?: string };
    expect(step.payload?.tool).toBe('supabase.query');
    expect(step.summary).toMatch(/^supabase\.query:/);
    const done = patches.find((p) => p.patch.status === 'done');
    expect(done?.patch.report).toMatch(/3 leads/);
    expect((done?.patch.result as { steps?: Array<{ name: string }> } | undefined)?.steps?.[0]?.name).toBe(
      'supabase.query',
    );
  });

  it('calls computer_screenshot via Anthropic then logs computer.screenshot', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'awad-comp-'));
    const { db, events } = memoryDb();
    const registry = createToolRegistry(computerTools(createFakeRuntime(dir)));
    const sent: string[] = [];
    const client: AnthropicLike = {
      messages: {
        create: async (args) => {
          sent.push(...args.tools.map((tool) => tool.name));
          return {
            stop_reason: 'tool_use',
            usage: { input_tokens: 4, output_tokens: 4 },
            content: [{ type: 'tool_use', id: 'tu1', name: 'computer_screenshot', input: {} }],
          };
        },
      },
    };

    await runTask(task(), { db, client, model: 'claude-sonnet-5', maxSteps: 1, registry });

    expect(sent).toContain('computer_screenshot');
    expect(sent).not.toContain('computer.screenshot');
    const step = events.find(
      (e) => (e as { payload?: { tool?: string } }).payload?.tool === 'computer.screenshot',
    );
    expect(step).toBeTruthy();
  });

  it('marks the task failed when budget is already spent', async () => {
    const { db, events, patches } = memoryDb();
    const client: AnthropicLike = {
      messages: {
        create: async () => {
          throw new Error('should not be called');
        },
      },
    };
    await runTask(task({ spent_usd: 1, budget_usd: 0.5 }), { db, client, model: 'claude-sonnet-5', maxSteps: 2 });
    expect(patches.some((p) => p.patch.status === 'failed')).toBe(true);
    expect(events.some((e) => (e as { type: string }).type === 'system.error')).toBe(true);
  });
});

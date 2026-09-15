import { describe, expect, it } from 'vitest';
import { buildAgentSystemPrompt, runTask, type AnthropicLike } from './agent.js';
import type { WorkerDb } from './db.js';
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
  });

  it('writes started/step/completed events and a report', async () => {
    const { db, events, patches } = memoryDb();
    let round = 0;
    const client: AnthropicLike = {
      messages: {
        create: async () => {
          round += 1;
          if (round === 1) {
            return {
              stop_reason: 'tool_use',
              usage: { input_tokens: 10, output_tokens: 5 },
              content: [
                {
                  type: 'tool_use',
                  id: 'tu1',
                  name: 'supabase.query',
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

    expect(events.map((e) => (e as { type: string }).type)).toEqual([
      'agent.task.started',
      'agent.step',
      'agent.step',
      'agent.task.completed',
    ]);
    const done = patches.find((p) => p.patch.status === 'done');
    expect(done?.patch.report).toMatch(/3 leads/);
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

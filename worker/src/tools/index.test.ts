import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { TaskRow } from '../types.js';
import { assertToolAllowed, createToolRegistry, ToolGuardError, type ToolContext, type WorkerTool } from './index.js';

function task(patch: Partial<TaskRow> = {}): TaskRow {
  return {
    id: 't1',
    created_at: '2026-01-01',
    agent_id: 'contraxis.analytics-agent',
    title: 'demo',
    instruction: 'do it',
    status: 'running',
    source: 'ceo',
    created_by: 'ceo',
    started_at: null,
    completed_at: null,
    result: null,
    error: null,
    report: null,
    lease_until: null,
    worker_id: null,
    claimed_at: null,
    budget_usd: 0.5,
    spent_usd: 0,
    approval_id: null,
    ...patch,
  };
}

function ctx(patch: Partial<ToolContext> = {}): ToolContext {
  return {
    task: task(),
    approval: null,
    db: {} as ToolContext['db'],
    ...patch,
  };
}

const refund: WorkerTool = {
  name: 'stripe.refund',
  description: 'money',
  schema: z.object({}),
  jsonSchema: { type: 'object' },
  risk: 'money',
  run: async () => ({ ok: true }),
};

describe('tool guard', () => {
  it('always allows read tools', () => {
    const registry = createToolRegistry();
    const read = registry.get('supabase.query')!;
    expect(() => assertToolAllowed(read, ctx())).not.toThrow();
  });

  it('refuses money/destructive without an approved approval', () => {
    expect(() => assertToolAllowed(refund, ctx())).toThrow(ToolGuardError);
    expect(() =>
      assertToolAllowed(refund, ctx({ task: task({ approval_id: 'apr' }), approval: { id: 'apr', status: 'pending' } })),
    ).toThrow(/approved/);
  });

  it('allows money tools when the linked approval is approved', () => {
    expect(() =>
      assertToolAllowed(
        refund,
        ctx({ task: task({ approval_id: 'apr' }), approval: { id: 'apr', status: 'approved' } }),
      ),
    ).not.toThrow();
  });

  it('allows write tools for human tasks or approved plans only', () => {
    const write: WorkerTool = { ...refund, name: 'email.send', risk: 'write' };
    expect(() => assertToolAllowed(write, ctx({ task: task({ source: 'ceo' }) }))).toThrow(ToolGuardError);
    expect(() => assertToolAllowed(write, ctx({ task: task({ source: 'human' }) }))).not.toThrow();
    expect(() =>
      assertToolAllowed(
        write,
        ctx({ task: task({ source: 'ceo', approval_id: 'apr' }), approval: { id: 'apr', status: 'approved' } }),
      ),
    ).not.toThrow();
  });

  it('registers the first two read tools', () => {
    const names = createToolRegistry().list().map((tool) => tool.name);
    expect(names).toEqual(['supabase.query', 'http.fetch']);
  });
});

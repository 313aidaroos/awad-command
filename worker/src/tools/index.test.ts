import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ANTHROPIC_TOOL_NAME } from '../anthropicToolNames.js';
import type { TaskRow } from '../types.js';
import { Phase1RecordOnlyError } from './computer/safety.js';
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

  it('refuses money/destructive even when an approval is approved (Phase 1 record-only)', () => {
    expect(() => assertToolAllowed(refund, ctx())).toThrow(Phase1RecordOnlyError);
    expect(() =>
      assertToolAllowed(
        refund,
        ctx({ task: task({ approval_id: 'apr' }), approval: { id: 'apr', status: 'approved' } }),
      ),
    ).toThrow(/record-only/);
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

  it('sends legal Anthropic names while keeping dotted registry names', () => {
    const registry = createToolRegistry();
    expect(registry.list().map((tool) => tool.name)).toEqual(['supabase.query', 'http.fetch']);
    const wired = registry.anthropicTools();
    expect(wired.map((tool) => tool.name)).toEqual(['supabase_query', 'http_fetch']);
    for (const tool of wired) {
      expect(tool.name).toMatch(ANTHROPIC_TOOL_NAME);
      expect(tool.name).not.toContain('.');
    }
  });
});

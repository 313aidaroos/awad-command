import { z } from 'zod';
import type { WorkerDb } from '../db.js';
import type { ApprovalRow, TaskRow, ToolRisk } from '../types.js';
import { httpFetchInput, runHttpFetch } from './httpFetch.js';
import { runSupabaseQuery, supabaseQueryInput } from './supabaseQuery.js';

export interface ToolContext {
  task: TaskRow;
  approval: ApprovalRow | null;
  db: WorkerDb;
}

export interface WorkerTool<T = unknown> {
  name: string;
  description: string;
  schema: z.ZodType<T>;
  jsonSchema: Record<string, unknown>;
  risk: ToolRisk;
  run: (input: T, ctx: ToolContext) => Promise<unknown>;
}

export class ToolGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolGuardError';
  }
}

export function assertToolAllowed(tool: WorkerTool, ctx: ToolContext): void {
  if (tool.risk === 'read') return;
  const approved = ctx.approval?.status === 'approved';
  if (tool.risk === 'money' || tool.risk === 'destructive') {
    if (!ctx.task.approval_id || !approved) {
      throw new ToolGuardError(
        `${tool.name} is ${tool.risk} and refuses to run without an approved approval row`,
      );
    }
    return;
  }
  if (tool.risk === 'write') {
    const human = ctx.task.source === 'human';
    if (!human && !approved) {
      throw new ToolGuardError(`${tool.name} is write and needs a human task or an approved plan`);
    }
  }
}

export function createToolRegistry(extras: WorkerTool[] = []): {
  list: () => WorkerTool[];
  get: (name: string) => WorkerTool | undefined;
  execute: (name: string, input: unknown, ctx: ToolContext) => Promise<unknown>;
  anthropicTools: () => Array<{ name: string; description: string; input_schema: Record<string, unknown> }>;
} {
  const tools: WorkerTool[] = [
    {
      name: 'supabase.query',
      description: 'Read-only query against whitelist views v_leads, v_sales, v_events, v_metrics.',
      schema: supabaseQueryInput,
      jsonSchema: {
        type: 'object',
        properties: {
          view: { type: 'string', enum: ['v_leads', 'v_sales', 'v_events', 'v_metrics'] },
          sql: { type: 'string', description: 'Optional SELECT from a whitelist view only.' },
          projectSlug: { type: 'string' },
          limit: { type: 'integer', minimum: 1, maximum: 100 },
        },
      },
      risk: 'read',
      run: (input, ctx) => runSupabaseQuery(supabaseQueryInput.parse(input), ctx.db),
    },
    {
      name: 'http.fetch',
      description: 'HTTP GET a public URL. 1 MB cap, 10s timeout, private IPs blocked.',
      schema: httpFetchInput,
      jsonSchema: {
        type: 'object',
        properties: { url: { type: 'string' } },
        required: ['url'],
      },
      risk: 'read',
      run: (input) => runHttpFetch(httpFetchInput.parse(input)),
    },
    ...extras,
  ];
  const byName = new Map(tools.map((tool) => [tool.name, tool]));

  return {
    list: () => tools,
    get: (name) => byName.get(name),
    async execute(name, input, ctx) {
      const tool = byName.get(name);
      if (!tool) throw new Error(`Unknown tool ${name}`);
      assertToolAllowed(tool, ctx);
      const parsed = tool.schema.parse(input);
      return tool.run(parsed, ctx);
    },
    anthropicTools: () =>
      tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.jsonSchema as { type: 'object'; properties?: Record<string, unknown> },
      })),
  };
}

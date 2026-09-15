import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { WorkerDb } from '../../db.js';
import type { TaskRow } from '../../types.js';
import { createToolRegistry, type ToolContext } from '../index.js';
import { computerTools } from './index.js';
import { createFakeRuntime } from './runtime.js';
import { SensitiveActionPause } from './safety.js';

function task(patch: Partial<TaskRow> = {}): TaskRow {
  return {
    id: 'task-1',
    created_at: '2026-01-01',
    agent_id: 'contraxis.analytics-agent',
    title: 'screen',
    instruction: 'screenshot',
    status: 'running',
    source: 'human',
    created_by: 'awad',
    started_at: null,
    completed_at: null,
    result: null,
    error: null,
    report: null,
    lease_until: null,
    worker_id: 'contraxis-computer-1',
    claimed_at: null,
    budget_usd: 0.5,
    spent_usd: 0,
    approval_id: null,
    capabilities: ['computer'],
    ...patch,
  };
}

function memoryDb() {
  const screens: unknown[] = [];
  const db: WorkerDb = {
    claimTask: async () => null,
    updateTask: async () => undefined,
    insertEvent: async () => undefined,
    heartbeat: async () => undefined,
    releaseTask: async () => undefined,
    getApproval: async () => null,
    getAgent: async () => null,
    getProject: async () => null,
    queryView: async () => [],
    getWorkerStatus: async () => null,
    insertApproval: async () => ({ id: 'apr', status: 'pending' }),
    recordScreen: async (row) => {
      screens.push(row);
      return { screenshot_url: row.screenshot_url ?? null, storage_path: row.storage_path };
    },
    uploadScreenshot: async (path) => ({ path, signedUrl: `https://signed.example/${path}` }),
  };
  return { db, screens };
}

describe('computer tools', () => {
  it('registers screenshot as read and navigate as write', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'awad-comp-'));
    const registry = createToolRegistry(computerTools(createFakeRuntime(dir)));
    expect(registry.get('computer.screenshot')?.risk).toBe('read');
    expect(registry.get('computer.navigate')?.risk).toBe('write');
    expect(registry.anthropicTools().map((tool) => tool.name)).toEqual([
      'supabase_query',
      'http_fetch',
      'computer_screenshot',
      'computer_navigate',
    ]);
  });

  it('takes a screenshot without approval', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'awad-comp-'));
    const { db } = memoryDb();
    const registry = createToolRegistry(computerTools(createFakeRuntime(dir)));
    const ctx: ToolContext = { task: task({ source: 'ceo' }), approval: null, db, projectSlug: 'contraxis' };
    const result = (await registry.execute('computer.screenshot', {}, ctx)) as { screenshot_url?: string };
    expect(result.screenshot_url).toMatch(/signed\.example/);
  });

  it('refuses navigate without a human task or approved plan', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'awad-comp-'));
    const { db } = memoryDb();
    const registry = createToolRegistry(computerTools(createFakeRuntime(dir)));
    const ctx: ToolContext = { task: task({ source: 'ceo' }), approval: null, db, projectSlug: 'contraxis' };
    await expect(registry.execute('computer.navigate', { url: 'https://contraxis.com' }, ctx)).rejects.toThrow(
      /approved plan/,
    );
  });

  it('navigates when the task is human or approved', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'awad-comp-'));
    const { db } = memoryDb();
    const registry = createToolRegistry(computerTools(createFakeRuntime(dir)));
    const ctx: ToolContext = { task: task({ source: 'human' }), approval: null, db, projectSlug: 'contraxis' };
    const result = (await registry.execute('computer.navigate', { url: 'https://contraxis.com' }, ctx)) as {
      url?: string;
    };
    expect(result.url).toMatch(/^https:\/\/contraxis\.com\/?$/);
  });

  it('pauses checkout navigation for approval', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'awad-comp-'));
    const { db } = memoryDb();
    const registry = createToolRegistry(computerTools(createFakeRuntime(dir)));
    const ctx: ToolContext = { task: task({ source: 'human' }), approval: null, db, projectSlug: 'contraxis' };
    await expect(registry.execute('computer.navigate', { url: 'https://shop.example/checkout' }, ctx)).rejects.toBeInstanceOf(
      SensitiveActionPause,
    );
  });

  it('reuses one browser page across navigate then later screenshots', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'awad-comp-'));
    const { db, screens } = memoryDb();
    const runtime = createFakeRuntime(dir);
    const registry = createToolRegistry(computerTools(runtime));
    const ctx: ToolContext = { task: task({ source: 'human' }), approval: null, db, projectSlug: 'contraxis' };

    const nav = (await registry.execute('computer.navigate', { url: 'https://example.com/' }, ctx)) as {
      url?: string;
      screenshot_url?: string;
    };
    expect(nav.url).toBe('https://example.com/');
    expect(nav.screenshot_url).toMatch(/signed\.example/);

    const shot1 = (await registry.execute('computer.screenshot', {}, ctx)) as { url?: string };
    const shot2 = (await registry.execute('computer.screenshot', {}, ctx)) as { url?: string };
    expect(shot1.url).toBe('https://example.com/');
    expect(shot2.url).toBe('https://example.com/');
    expect(runtime.stats.opens).toBe(1);
    expect(runtime.stats.closes).toBe(0);
    expect(screens).toHaveLength(3);
    expect(screens[0]).toMatchObject({ page_url: 'https://example.com/' });
    expect(screens[2]).toMatchObject({ page_url: 'https://example.com/' });
  });

  it('resets to about:blank only after the process closes the session', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'awad-comp-'));
    const { db } = memoryDb();
    const runtime = createFakeRuntime(dir);
    const registry = createToolRegistry(computerTools(runtime));
    const ctx: ToolContext = { task: task({ source: 'human' }), approval: null, db, projectSlug: 'contraxis' };

    await registry.execute('computer.navigate', { url: 'https://example.com/' }, ctx);
    await runtime.closeAll();
    const shot = (await registry.execute('computer.screenshot', {}, ctx)) as { url?: string };
    expect(shot.url).toBe('about:blank');
    expect(runtime.stats.opens).toBe(2);
    expect(runtime.stats.closes).toBe(1);
  });

  it('keeps separate pages per project', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'awad-comp-'));
    const { db } = memoryDb();
    const runtime = createFakeRuntime(dir);
    const registry = createToolRegistry(computerTools(runtime));
    const contraxis: ToolContext = { task: task({ source: 'human' }), approval: null, db, projectSlug: 'contraxis' };
    const lyrixis: ToolContext = { task: task({ source: 'human' }), approval: null, db, projectSlug: 'lyrixis' };

    await registry.execute('computer.navigate', { url: 'https://example.com/' }, contraxis);
    const other = (await registry.execute('computer.screenshot', {}, lyrixis)) as { url?: string };
    const same = (await registry.execute('computer.screenshot', {}, contraxis)) as { url?: string };
    expect(other.url).toBe('about:blank');
    expect(same.url).toBe('https://example.com/');
    expect(runtime.stats.opens).toBe(2);
    expect(runtime.stats.closes).toBe(0);
  });
});

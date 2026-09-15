import { describe, expect, it } from 'vitest';
import { createLoop } from './loop.js';
import type { WorkerDb } from './db.js';
import type { TaskRow } from './types.js';

function task(id: string): TaskRow {
  return {
    id,
    created_at: '2026-01-01T00:00:00Z',
    agent_id: 'contraxis.analytics-agent',
    title: 't',
    instruction: 'do',
    status: 'queued',
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
  };
}

describe('worker loop', () => {
  it('claims a queued task, runs it, and heartbeats', async () => {
    const claimed: string[] = [];
    const ran: string[] = [];
    const beats: string[] = [];
    const db: WorkerDb = {
      claimTask: async (workerId) => {
        claimed.push(workerId);
        return claimed.length === 1 ? task('t1') : null;
      },
      updateTask: async () => undefined,
      insertEvent: async () => undefined,
      heartbeat: async (id) => {
        beats.push(id);
      },
      releaseTask: async () => undefined,
      getApproval: async () => null,
      getAgent: async () => ({
        id: 'contraxis.analytics-agent',
        project_slug: 'contraxis',
        name: 'Analytics',
        role: 'Analytics',
        objective: '',
        tools: [],
        memory: {},
      }),
      getProject: async () => null,
      queryView: async () => [],
    };

    const loop = createLoop({
      db,
      workerId: 'w1',
      pollMs: 5,
      heartbeatMs: 0,
      runTask: async (row) => {
        ran.push(row.id);
      },
      now: () => 1,
    });

    await loop.tick();
    expect(claimed).toEqual(['w1']);
    expect(ran).toEqual(['t1']);
    expect(beats.length).toBeGreaterThan(0);
  });

  it('releases the in-flight task on shutdown', async () => {
    const released: string[] = [];
    let resolveRun: () => void = () => undefined;
    const running = new Promise<void>((resolve) => {
      resolveRun = resolve;
    });
    const db: WorkerDb = {
      claimTask: async () => task('t2'),
      updateTask: async () => undefined,
      insertEvent: async () => undefined,
      heartbeat: async () => undefined,
      releaseTask: async (id) => {
        released.push(id);
      },
      getApproval: async () => null,
      getAgent: async () => null,
      getProject: async () => null,
      queryView: async () => [],
    };
    const loop = createLoop({
      db,
      workerId: 'w1',
      pollMs: 50,
      heartbeatMs: 10_000,
      runTask: async () => running,
      now: () => 0,
    });
    const tickPromise = loop.tick();
    for (let i = 0; i < 20 && !loop.inFlight; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    expect(loop.inFlight?.id).toBe('t2');
    await loop.shutdown();
    resolveRun();
    await tickPromise;
    expect(released).toContain('t2');
  });
});

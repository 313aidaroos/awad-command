import type { WorkerDb } from './db.js';
import { log, logError } from './log.js';
import type { TaskRow } from './types.js';

export interface LoopDeps {
  db: WorkerDb;
  workerId: string;
  pollMs: number;
  heartbeatMs: number;
  runTask: (task: TaskRow) => Promise<void>;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export function createLoop(deps: LoopDeps) {
  let stopped = false;
  let inFlight: TaskRow | null = null;
  let lastProject: string | null = null;
  let lastHeartbeat = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const now = deps.now ?? Date.now;
  const sleep = deps.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

  async function beat() {
    const t = now();
    if (t - lastHeartbeat < deps.heartbeatMs) return;
    lastHeartbeat = t;
    await deps.db.heartbeat(deps.workerId);
    log('heartbeat', { workerId: deps.workerId });
  }

  async function tick() {
    if (stopped) return;
    await beat();
    if (inFlight) return;
    const task = await deps.db.claimTask(deps.workerId, lastProject);
    if (!task) return;
    inFlight = task;
    log('task.claimed', { taskId: task.id, agentId: task.agent_id });
    try {
      if (stopped) {
        await deps.db.releaseTask(task.id);
        return;
      }
      await deps.runTask(task);
      const agent = await deps.db.getAgent(task.agent_id).catch(() => null);
      lastProject = agent?.project_slug ?? lastProject;
    } catch (err) {
      logError('loop.task_error', err, { taskId: task.id });
      await deps.db.updateTask(task.id, {
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
        completed_at: new Date().toISOString(),
      });
    } finally {
      inFlight = null;
    }
  }

  async function poll() {
    while (!stopped) {
      try {
        await tick();
      } catch (err) {
        logError('loop.tick_error', err);
      }
      if (stopped) break;
      await sleep(deps.pollMs);
    }
  }

  return {
    start() {
      stopped = false;
      void beat();
      void poll();
      log('loop.start', { workerId: deps.workerId, pollMs: deps.pollMs });
    },
    async shutdown() {
      stopped = true;
      if (timer) clearTimeout(timer);
      if (inFlight) {
        await deps.db.releaseTask(inFlight.id);
        log('task.released', { taskId: inFlight.id, reason: 'shutdown' });
        inFlight = null;
      }
    },
    get inFlight() {
      return inFlight;
    },
    tick,
  };
}

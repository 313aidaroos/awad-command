import Anthropic from '@anthropic-ai/sdk';
import { runTask } from './agent.js';
import { createDb, createServiceClient } from './db.js';
import { loadWorkerEnv } from './env.js';
import { log, logError } from './log.js';
import { createLoop } from './loop.js';

async function main() {
  const env = loadWorkerEnv();
  const client = createServiceClient(env);
  const db = createDb(client, env.leaseMs);
  const anthropic = new Anthropic({ apiKey: env.anthropicApiKey });
  const loop = createLoop({
    db,
    workerId: env.workerId,
    pollMs: env.pollMs,
    heartbeatMs: env.heartbeatMs,
    runTask: (task) =>
      runTask(task, {
        db,
        client: anthropic as unknown as Parameters<typeof runTask>[1]['client'],
        model: env.workerModel,
        maxSteps: env.maxSteps,
      }),
  });

  const halt = async (signal: string) => {
    log('shutdown', { signal });
    await loop.shutdown();
    process.exit(0);
  };
  process.on('SIGTERM', () => void halt('SIGTERM'));
  process.on('SIGINT', () => void halt('SIGINT'));

  loop.start();
}

main().catch((err) => {
  logError('fatal', err);
  process.exit(1);
});

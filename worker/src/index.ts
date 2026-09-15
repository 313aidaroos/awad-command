import Anthropic from '@anthropic-ai/sdk';
import { runTask } from './agent.js';
import { hasComputerCapability, normalizeCapabilities, parseCapabilities } from './capabilities.js';
import { createDb, createServiceClient } from './db.js';
import { loadWorkerEnv } from './env.js';
import { log, logError } from './log.js';
import { createLoop } from './loop.js';
import { computerTools, createPlaywrightRuntime, createUnavailableRuntime } from './tools/computer/index.js';
import { createToolRegistry } from './tools/index.js';

async function main() {
  const env = loadWorkerEnv();
  const capabilities = normalizeCapabilities(parseCapabilities(env.workerCapabilities));
  const computer = hasComputerCapability(capabilities);
  const client = createServiceClient(env);
  const db = createDb(client, env.leaseMs);
  const anthropic = new Anthropic({ apiKey: env.anthropicApiKey });
  const runtime = computer
    ? await createPlaywrightRuntime({ dataDir: env.dataDir, headless: env.computerHeadless })
    : createUnavailableRuntime(
        env.dataDir,
        'This process is not a computer worker. Set WORKER_CAPABILITIES=computer on a VM/Railway box with Chromium. See docs/COMPUTER_SETUP.md.',
      );
  const registry = createToolRegistry(computer ? computerTools(runtime) : []);

  const loop = createLoop({
    db,
    workerId: env.workerId,
    pollMs: env.pollMs,
    heartbeatMs: env.heartbeatMs,
    capabilities,
    heartbeatDetail: {
      capabilities,
      computer,
      kind: computer ? 'computer-worker' : 'worker',
      data_dir: env.dataDir,
    },
    runTask: (task) =>
      runTask(task, {
        db,
        client: anthropic as unknown as Parameters<typeof runTask>[1]['client'],
        model: env.workerModel,
        maxSteps: env.maxSteps,
        workerId: env.workerId,
        registry,
      }),
  });

  const halt = async (signal: string) => {
    log('shutdown', { signal });
    await loop.shutdown();
    await runtime.closeAll();
    process.exit(0);
  };
  process.on('SIGTERM', () => void halt('SIGTERM'));
  process.on('SIGINT', () => void halt('SIGINT'));

  log('worker.start', {
    workerId: env.workerId,
    capabilities,
    computer,
    runtimeEnabled: runtime.enabled,
  });
  loop.start();
}

main().catch((err) => {
  logError('fatal', err);
  process.exit(1);
});

import { z } from 'zod';
import type { ToolContext, WorkerTool } from '../index.js';
import type { ComputerRuntime } from './runtime.js';
import { persistScreenshotPng } from './storage.js';

export const computerScreenshotInput = z.object({
  fullPage: z.boolean().optional(),
});

export function computerScreenshotTool(runtime: ComputerRuntime): WorkerTool {
  return {
    name: 'computer.screenshot',
    description:
      'Read-only PNG of the current agent browser page. Uploads to the agent-screens bucket when storage is configured. Never spends, publishes, or types.',
    schema: computerScreenshotInput,
    jsonSchema: {
      type: 'object',
      properties: {
        fullPage: { type: 'boolean', description: 'Capture the full scrollable page.' },
      },
    },
    risk: 'read',
    async run(input, ctx: ToolContext) {
      if (!runtime.enabled) {
        return { error: runtime.reason ?? 'Computer runtime is not connected.' };
      }
      const projectSlug = ctx.projectSlug ?? 'unknown';
      const session = await runtime.open(projectSlug);
      try {
        const page = await session.page();
        const bytes = await page.screenshot({ fullPage: input.fullPage === true });
        const stored = await persistScreenshotPng(ctx.db, {
          projectSlug,
          taskId: ctx.task.id,
          workerId: ctx.task.worker_id,
          bytes,
          dataDir: runtime.dataDir,
        });
        ctx.lastScreenshotUrl = stored.screenshot_url ?? undefined;
        return {
          ok: true,
          risk: 'read',
          url: page.url(),
          screenshot_url: stored.screenshot_url,
          storage_path: stored.storage_path,
          local_path: stored.local_path ?? null,
          note: stored.screenshot_url
            ? undefined
            : 'No public screenshot_url yet. Bucket agent-screens or a stub URL is still needed. See docs/COMPUTER_SETUP.md.',
        };
      } finally {
        await session.close();
      }
    },
  };
}

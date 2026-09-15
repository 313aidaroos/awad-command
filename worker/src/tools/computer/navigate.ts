import { z } from 'zod';
import { isBlockedHostname } from '../httpFetch.js';
import type { ToolContext, WorkerTool } from '../index.js';
import type { ComputerRuntime } from './runtime.js';
import { persistScreenshotPng } from './storage.js';
import { describeSensitiveHit, SensitiveActionPause } from './safety.js';

export const computerNavigateInput = z.object({
  url: z.string().min(1).max(2000),
});

export function computerNavigateTool(runtime: ComputerRuntime): WorkerTool {
  return {
    name: 'computer.navigate',
    description:
      'Write: open a public http(s) URL in the agent browser (persistent profile per project). Needs a human task or an approved plan. Purchase / publish / delete / send-to-customer URLs pause for Approve.',
    schema: computerNavigateInput,
    jsonSchema: {
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url'],
    },
    risk: 'write',
    async run(raw, ctx: ToolContext) {
      const input = computerNavigateInput.parse(raw);
      if (!runtime.enabled) {
        return { error: runtime.reason ?? 'Computer runtime is not connected.' };
      }

      let parsed: URL;
      try {
        parsed = new URL(input.url);
      } catch {
        throw new Error('Invalid URL');
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Only http(s) URLs are allowed');
      }
      if (isBlockedHostname(parsed.hostname)) {
        throw new Error('Private or blocked hosts are not allowed');
      }

      const sensitive = describeSensitiveHit({
        name: 'computer.navigate',
        description: thisDescription(),
        raw: input.url,
      });
      if (sensitive) {
        throw new SensitiveActionPause(sensitive, 'computer.navigate', ctx.lastScreenshotUrl);
      }

      const projectSlug = ctx.projectSlug ?? 'unknown';
      const session = await runtime.open(projectSlug);
      try {
        const page = await session.page();
        await page.goto(parsed.toString(), { timeout: 20_000 });
        const bytes = await page.screenshot({ fullPage: false });
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
          risk: 'write',
          url: page.url(),
          screenshot_url: stored.screenshot_url,
          storage_path: stored.storage_path,
          local_path: stored.local_path ?? null,
        };
      } finally {
        await session.close();
      }
    },
  };
}

function thisDescription(): string {
  return 'open a public URL in the agent browser';
}

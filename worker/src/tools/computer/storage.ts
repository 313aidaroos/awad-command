import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { WorkerDb } from '../../db.js';

export interface ScreenUpload {
  storage_path: string;
  screenshot_url: string | null;
  local_path?: string;
}

export async function persistScreenshotPng(
  db: WorkerDb,
  input: {
    projectSlug: string;
    taskId: string;
    workerId?: string | null;
    bytes: Buffer;
    dataDir: string;
    pageUrl?: string | null;
  },
): Promise<ScreenUpload> {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const storagePath = `${input.projectSlug}/${input.taskId}/${stamp}.png`;

  const uploaded = await db.uploadScreenshot(storagePath, input.bytes, 'image/png');
  const recorded = await db.recordScreen({
    project_slug: input.projectSlug,
    task_id: input.taskId,
    worker_id: input.workerId ?? null,
    storage_path: uploaded.path,
    screenshot_url: uploaded.signedUrl ?? null,
    page_url: input.pageUrl ?? null,
  });

  if (uploaded.signedUrl || recorded.screenshot_url) {
    return {
      storage_path: uploaded.path,
      screenshot_url: uploaded.signedUrl ?? recorded.screenshot_url,
    };
  }

  const localDir = join(input.dataDir, 'screens', input.projectSlug);
  await mkdir(localDir, { recursive: true });
  const localPath = join(localDir, `${input.taskId}-${stamp}.png`);
  await writeFile(localPath, input.bytes);
  return {
    storage_path: uploaded.path,
    screenshot_url: null,
    local_path: localPath,
  };
}

export interface LatestScreenshot {
  url: string;
  ts: number;
  summary?: string;
  projectSlug?: string;
  taskId?: string;
  source: 'event' | 'storage' | 'stub';
}

export interface ComputerPanelView {
  kind: 'coming-online' | 'waiting' | 'screenshot';
  url?: string;
  source?: LatestScreenshot['source'];
  headline: string;
  detail: string;
}

export function screenshotUrlFromPayload(payload?: Record<string, unknown> | null): string | null {
  const raw = payload?.screenshot_url;
  if (typeof raw !== 'string') return null;
  const url = raw.trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url) && !url.startsWith('/')) return null;
  return url;
}

export function latestScreenshotFromEvents(
  events: Array<{
    ts: number;
    type: string;
    projectSlug?: string;
    summary: string;
    payload?: Record<string, unknown>;
  }>,
  projectSlug?: string,
): LatestScreenshot | null {
  for (const event of events) {
    if (projectSlug && event.projectSlug && event.projectSlug !== projectSlug) continue;
    const url = screenshotUrlFromPayload(event.payload);
    if (!url) continue;
    const taskId = typeof event.payload?.task_id === 'string' ? event.payload.task_id : undefined;
    return {
      url,
      ts: event.ts,
      summary: event.summary,
      projectSlug: event.projectSlug,
      taskId,
      source: 'event',
    };
  }
  return null;
}

export function resolveComputerPanelView(input: {
  latest?: LatestScreenshot | null;
  stubUrl?: string | null;
  workerConnected: boolean;
  halted?: boolean;
}): ComputerPanelView {
  if (input.latest?.url) {
    return {
      kind: 'screenshot',
      url: input.latest.url,
      source: input.latest.source,
      headline: input.halted ? 'Halted' : 'Agent screen',
      detail:
        input.latest.source === 'stub'
          ? 'Stub URL (not a live worker frame).'
          : input.latest.summary || 'Latest screenshot from the computer worker.',
    };
  }
  const stub = input.stubUrl?.trim();
  if (stub) {
    return {
      kind: 'screenshot',
      url: stub,
      source: 'stub',
      headline: 'Agent screen · stub',
      detail: 'Stub URL only. No worker computer has posted a live screenshot yet.',
    };
  }
  if (input.halted) {
    return {
      kind: 'coming-online',
      headline: 'Halted',
      detail: 'This computer worker is halted. Clear system_status before it will claim work again.',
    };
  }
  if (input.workerConnected) {
    return {
      kind: 'waiting',
      headline: 'Worker connected',
      detail: 'Computer worker is online. Waiting for the first screenshot from computer.screenshot or computer.navigate.',
    };
  }
  return {
    kind: 'coming-online',
    headline: 'Coming online',
    detail:
      'No computer worker is connected. A Railway/VM process with WORKER_CAPABILITIES=computer still needs to heartbeat. Nothing here spends, publishes, or deletes.',
  };
}

export function inferComputerCapabilities(instruction: string): string[] {
  const q = instruction.toLowerCase();
  if (
    /\b(computer|screenshot|playwright|browser|chromium|kdp|xvfb|novnc)\b/.test(q) ||
    /mobile and desktop/.test(q) ||
    /screenshot every page/.test(q)
  ) {
    return ['computer'];
  }
  return [];
}

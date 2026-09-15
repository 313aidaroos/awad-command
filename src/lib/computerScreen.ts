export interface LatestScreenshot {
  url: string;
  ts: number;
  summary?: string;
  projectSlug?: string;
  taskId?: string;
  source: 'event' | 'storage' | 'stub';
  pageUrl?: string | null;
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

export function pageUrlFromPayload(payload?: Record<string, unknown> | null): string | null {
  const raw = payload?.page_url ?? payload?.url;
  if (typeof raw !== 'string') return null;
  const url = raw.trim();
  return url || null;
}

/** True only when we know the browser was on an empty tab — missing page_url is not treated as blank. */
export function isBlankBrowserUrl(url?: string | null): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  if (!trimmed) return false;
  return (
    trimmed === 'about:blank' ||
    trimmed === 'about:newtab' ||
    trimmed === 'chrome://newtab/' ||
    trimmed === 'chrome://new-tab-page/'
  );
}

/**
 * Newest-first rows. If the newest frame is about:blank and an earlier frame in the
 * same task has a real page, prefer that. Otherwise keep the newest.
 */
export function preferNonBlankScreenshot(rows: LatestScreenshot[]): LatestScreenshot | null {
  if (rows.length === 0) return null;
  const newest = rows[0];
  if (!isBlankBrowserUrl(newest.pageUrl)) return newest;
  const taskId = newest.taskId;
  const better = rows.find((row) => {
    if (isBlankBrowserUrl(row.pageUrl)) return false;
    if (taskId && row.taskId && row.taskId !== taskId) return false;
    return true;
  });
  return better ?? newest;
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
  const candidates: LatestScreenshot[] = [];
  for (const event of events) {
    if (projectSlug && event.projectSlug && event.projectSlug !== projectSlug) continue;
    const url = screenshotUrlFromPayload(event.payload);
    if (!url) continue;
    const taskId = typeof event.payload?.task_id === 'string' ? event.payload.task_id : undefined;
    candidates.push({
      url,
      ts: event.ts,
      summary: event.summary,
      projectSlug: event.projectSlug,
      taskId,
      source: 'event',
      pageUrl: pageUrlFromPayload(event.payload),
    });
  }
  return preferNonBlankScreenshot(candidates);
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

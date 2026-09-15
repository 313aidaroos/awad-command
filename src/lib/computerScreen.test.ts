import { describe, expect, it } from 'vitest';
import {
  inferComputerCapabilities,
  isBlankBrowserUrl,
  latestScreenshotFromEvents,
  preferNonBlankScreenshot,
  resolveComputerPanelView,
  screenshotUrlFromPayload,
} from '@/lib/computerScreen';

describe('screenshotUrlFromPayload', () => {
  it('accepts http(s) and rooted paths only', () => {
    expect(screenshotUrlFromPayload({ screenshot_url: 'https://x/s.png' })).toBe('https://x/s.png');
    expect(screenshotUrlFromPayload({ screenshot_url: 'javascript:alert(1)' })).toBeNull();
    expect(screenshotUrlFromPayload({})).toBeNull();
  });
});

describe('latestScreenshotFromEvents', () => {
  it('returns the newest matching screenshot_url', () => {
    const shot = latestScreenshotFromEvents(
      [
        { ts: 2, type: 'agent.step', projectSlug: 'contraxis', summary: 'later', payload: { screenshot_url: 'https://a/2.png' } },
        { ts: 1, type: 'agent.step', projectSlug: 'contraxis', summary: 'earlier', payload: { screenshot_url: 'https://a/1.png' } },
      ],
      'contraxis',
    );
    expect(shot?.url).toBe('https://a/2.png');
  });

  it('does not invent a screenshot when none exist', () => {
    expect(latestScreenshotFromEvents([{ ts: 1, type: 'agent.step', projectSlug: 'contraxis', summary: 'hi', payload: {} }])).toBeNull();
  });

  it('skips a newer about:blank frame when the same task has content', () => {
    const shot = latestScreenshotFromEvents(
      [
        {
          ts: 3,
          type: 'agent.step',
          projectSlug: 'contraxis',
          summary: 'blank shot',
          payload: {
            screenshot_url: 'https://a/blank.png',
            page_url: 'about:blank',
            task_id: 'task-1',
          },
        },
        {
          ts: 2,
          type: 'agent.step',
          projectSlug: 'contraxis',
          summary: 'example.com',
          payload: {
            screenshot_url: 'https://a/example.png',
            page_url: 'https://example.com/',
            task_id: 'task-1',
          },
        },
      ],
      'contraxis',
    );
    expect(shot?.url).toBe('https://a/example.png');
  });
});

describe('preferNonBlankScreenshot', () => {
  it('keeps the newest frame when it is not blank', () => {
    const picked = preferNonBlankScreenshot([
      { url: 'https://a/2.png', ts: 2, source: 'storage', pageUrl: 'https://example.com/' },
      { url: 'https://a/1.png', ts: 1, source: 'storage', pageUrl: 'https://example.com/old' },
    ]);
    expect(picked?.url).toBe('https://a/2.png');
  });

  it('does not treat a missing page_url as blank', () => {
    const picked = preferNonBlankScreenshot([
      { url: 'https://a/new.png', ts: 2, source: 'storage' },
      { url: 'https://a/old.png', ts: 1, source: 'storage', pageUrl: 'https://example.com/' },
    ]);
    expect(picked?.url).toBe('https://a/new.png');
  });

  it('does not steal another task’s non-blank frame', () => {
    const picked = preferNonBlankScreenshot([
      { url: 'https://a/blank.png', ts: 2, source: 'storage', taskId: 't2', pageUrl: 'about:blank' },
      { url: 'https://a/other.png', ts: 1, source: 'storage', taskId: 't1', pageUrl: 'https://example.com/' },
    ]);
    expect(picked?.url).toBe('https://a/blank.png');
  });
});

describe('isBlankBrowserUrl', () => {
  it('matches empty tabs only', () => {
    expect(isBlankBrowserUrl('about:blank')).toBe(true);
    expect(isBlankBrowserUrl('https://example.com/')).toBe(false);
    expect(isBlankBrowserUrl(undefined)).toBe(false);
  });
});

describe('resolveComputerPanelView', () => {
  it('stays coming-online when no worker and no screenshot', () => {
    const view = resolveComputerPanelView({ latest: null, stubUrl: null, workerConnected: false });
    expect(view.kind).toBe('coming-online');
    expect(view.url).toBeUndefined();
  });

  it('shows a live or stub screenshot when a URL exists', () => {
    expect(
      resolveComputerPanelView({
        latest: { url: 'https://signed/x.png', ts: 1, source: 'storage' },
        stubUrl: null,
        workerConnected: true,
      }).kind,
    ).toBe('screenshot');
    expect(resolveComputerPanelView({ latest: null, stubUrl: 'https://stub/x.png', workerConnected: false }).source).toBe(
      'stub',
    );
  });

  it('is waiting when the worker is up but has not posted a frame', () => {
    expect(resolveComputerPanelView({ latest: null, stubUrl: null, workerConnected: true }).kind).toBe('waiting');
  });
});

describe('inferComputerCapabilities', () => {
  it('tags browser work and leaves API summaries alone', () => {
    expect(inferComputerCapabilities('Screenshot Contraxis on mobile and desktop')).toEqual(['computer']);
    expect(inferComputerCapabilities("Summarise today's leads")).toEqual([]);
  });
});

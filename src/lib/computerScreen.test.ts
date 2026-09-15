import { describe, expect, it } from 'vitest';
import {
  inferComputerCapabilities,
  latestScreenshotFromEvents,
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

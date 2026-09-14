import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import {
  approveEpisode,
  generateDemoVideo,
  generateEpisode,
  getDailyHostSnapshot,
  runDailyHostAutomation,
  runQualityControl,
  saveSettings,
  simulatePublish,
} from '@/daily-host/service';
import { DemoAvatarProvider, providerStatuses } from '@/daily-host/providers';
import { POST } from '@/app/api/daily-host/route';

const dataPath = path.join('/tmp', `daily-host-test-${process.pid}.json`);

describe('Daily AI Host vertical slice', () => {
  beforeAll(async () => {
    process.env.DAILY_HOST_LOCAL_DATA_PATH = dataPath;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    await rm(dataPath, { force: true });
  });

  afterAll(async () => {
    await rm(dataPath, { force: true });
  });

  it('persists generation and is idempotent for a daily key', async () => {
    const first = await generateEpisode({ date: '2026-09-14' });
    const repeated = await generateEpisode({ date: '2026-09-14' });
    const snapshot = await getDailyHostSnapshot();
    expect(repeated.id).toBe(first.id);
    expect(snapshot.episodes).toHaveLength(1);
    expect(snapshot.storageMode).toBe('local');
  });

  it('prevents immediate event, word, and quote duplicates for alternates', async () => {
    const first = (await getDailyHostSnapshot()).episodes[0]!;
    const alternate = await generateEpisode({ date: '2026-09-14', alternate: true });
    expect(alternate.historicalEvent.normalizedKey).not.toBe(first.historicalEvent.normalizedKey);
    expect(alternate.word.normalizedKey).not.toBe(first.word.normalizedKey);
    expect(alternate.quote.normalizedKey).not.toBe(first.quote.normalizedKey);
  });

  it('persists settings and respects the emergency pause', async () => {
    const snapshot = await getDailyHostSnapshot();
    await saveSettings({ ...snapshot.settings, tone: 'Warm and direct', paused: true });
    await expect(generateEpisode({ date: '2026-09-15' })).rejects.toThrow(/paused/i);
    await saveSettings({ ...(await getDailyHostSnapshot()).settings, paused: false });
    expect((await getDailyHostSnapshot()).settings.tone).toBe('Warm and direct');
  });

  it('keeps demo media honest and requires approval before simulated publishing', async () => {
    const episode = (await getDailyHostSnapshot()).episodes[0]!;
    const avatarResult = await new DemoAvatarProvider().generateVideo({
      avatarId: '',
      voiceId: '',
      script: episode.script.fullScript,
      aspectRatio: '9:16',
      duration: 55,
      resolution: '1080x1920',
    });
    expect(avatarResult.videoUrl).toBeNull();
    expect(providerStatuses().youtube).toBe('not_configured');
    await expect(simulatePublish(episode.id, 'youtube')).rejects.toThrow(/approve/i);
    await generateDemoVideo(episode.id);
    const checked = await runQualityControl(episode.id);
    expect(checked.qcStatus).toBe('warning');
    const approved = await approveEpisode(episode.id);
    expect(approved.status).toBe('ready_for_review');
    expect((await simulatePublish(episode.id, 'youtube')).status).toBe('simulated');
  });

  it('makes manual automation idempotent', async () => {
    const now = new Date('2026-09-15T13:00:00.000Z');
    const first = await runDailyHostAutomation('manual', now);
    const repeated = await runDailyHostAutomation('manual', now);
    expect(repeated.id).toBe(first.id);
    expect(first.status).toBe('completed');
  });

  it('rejects invalid API actions', async () => {
    const response = await POST(new Request('http://localhost/api/daily-host', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'publish_everything' }),
    }));
    expect(response.status).toBe(400);
  });
});

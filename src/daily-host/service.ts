import { quotes, words } from '@/daily-host/seeds';
import { getDailyHostRepository } from '@/daily-host/repository';
import {
  DemoAvatarProvider,
  DemoHistoricalResearchProvider,
  LocalScriptGenerator,
  getScriptGenerator,
  providerStatuses,
} from '@/daily-host/providers';
import type {
  AutomationRun,
  DailyEpisode,
  DailyHostSettings,
  PipelineStep,
  SocialPlatform,
  SocialPost,
} from '@/daily-host/types';

const research = new DemoHistoricalResearchProvider();
const avatar = new DemoAvatarProvider();
const terminalSteps = ['research', 'fact-check', 'select', 'script'];

function isoDate(timezone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function localTime(timezone: string, now: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(now);
}

function pipeline(): PipelineStep[] {
  return [
    ['research', 'Research'],
    ['fact-check', 'Fact check'],
    ['select', 'Select content'],
    ['script', 'Write script'],
    ['voice', 'Voice'],
    ['avatar', 'Avatar'],
    ['visuals', 'Visuals'],
    ['compose', 'Compose'],
    ['captions', 'Captions'],
    ['qc', 'QC'],
    ['publish', 'Publish'],
    ['analytics', 'Analytics'],
  ].map(([key, label]) => ({
    key: key ?? '',
    label: label ?? '',
    status: terminalSteps.includes(key ?? '') ? 'completed' : 'pending',
  }));
}

function unusedOrOldest<T extends { normalizedKey: string }>(pool: T[], used: Set<string>): T {
  const unused = pool.find((item) => !used.has(item.normalizedKey));
  return unused ?? pool[0]!;
}

function markSteps(episode: DailyEpisode, keys: string[], status: PipelineStep['status']) {
  const now = new Date().toISOString();
  episode.pipeline = episode.pipeline.map((step) =>
    keys.includes(step.key)
      ? { ...step, status, startedAt: step.startedAt ?? now, finishedAt: status === 'completed' ? now : undefined }
      : step,
  );
}

async function createScript(input: Parameters<LocalScriptGenerator['generate']>[0]) {
  try {
    return await getScriptGenerator().generate(input);
  } catch {
    return new LocalScriptGenerator().generate(input);
  }
}

async function withEpisode(id: string, change: (episode: DailyEpisode) => void) {
  const repository = getDailyHostRepository();
  const database = await repository.load();
  const current = database.episodes.find((episode) => episode.id === id);
  if (!current) throw new Error('Episode not found.');
  const episode = structuredClone(current);
  change(episode);
  episode.updatedAt = new Date().toISOString();
  return repository.updateEpisode(episode);
}

export async function getDailyHostSnapshot() {
  const repository = getDailyHostRepository();
  const database = await repository.load();
  return {
    storageMode: repository.mode,
    episodes: database.episodes,
    posts: database.posts,
    settings: database.settings,
    runs: database.runs,
    providers: providerStatuses(),
  };
}

export async function generateEpisode(input: {
  date?: string;
  alternate?: boolean;
  automatic?: boolean;
} = {}): Promise<DailyEpisode> {
  const repository = getDailyHostRepository();
  const database = await repository.load();
  if (database.settings.paused) throw new Error('Daily Host is paused. Resume automation before generating.');
  const date = input.date ?? isoDate(database.settings.timezone);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid episode date.');
  const sameDay = database.episodes.filter((episode) => episode.episodeDate === date);
  if (!input.alternate && sameDay[0]) return sameDay[0];

  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) throw new Error('Invalid episode date.');
  const candidates = await research.getEventsForDate(month, day);
  const selected = research.selectBestEvent(candidates, new Set(database.usedEventKeys));
  if (!selected) throw new Error('The curated historical event pool is exhausted for this date.');
  const event = await research.verifyEvent(selected);
  const eligibleWords =
    database.settings.wordDifficulty === 'mixed'
      ? words
      : words.filter((item) => item.difficulty === database.settings.wordDifficulty);
  const dailyWord = unusedOrOldest(eligibleWords, new Set(database.usedWordKeys));
  const dailyQuote = unusedOrOldest(
    quotes.filter((item) => item.verified),
    new Set(database.usedQuoteKeys),
  );
  const script = await createScript({
    date,
    event,
    word: dailyWord,
    quote: dailyQuote,
    desiredDuration: database.settings.durationTarget,
    tone: database.settings.tone,
  });
  const now = new Date().toISOString();
  const version = sameDay.length + 1;
  const episode: DailyEpisode = {
    id: crypto.randomUUID(),
    episodeDate: date,
    version,
    idempotencyKey: input.alternate ? `daily-host:${date}:v${version}` : `daily-host:${date}`,
    calendarMonth: month,
    calendarDay: day,
    historicalEvent: event,
    word: dailyWord,
    quote: dailyQuote,
    script,
    scriptVersion: 1,
    durationTarget: database.settings.durationTarget,
    tone: database.settings.tone,
    videoUrl: null,
    thumbnailUrl: null,
    status: 'script_ready',
    generationStatus: 'completed',
    qcStatus: 'pending',
    publishingStatus: 'not_started',
    approved: false,
    manualOrAutomatic: input.automatic ? 'automatic' : 'manual',
    pipeline: pipeline(),
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
  };
  try {
    return await repository.createEpisode(episode);
  } catch (error) {
    if (!input.alternate && /idempotency/i.test((error as Error).message)) {
      const refreshed = await repository.load();
      const existing = refreshed.episodes.find((item) => item.idempotencyKey === episode.idempotencyKey);
      if (existing) return existing;
    }
    throw error;
  }
}

export async function saveScript(id: string, fullScript: string) {
  if (!fullScript.trim() || fullScript.length > 8000) throw new Error('Script must contain 1–8,000 characters.');
  return withEpisode(id, (episode) => {
    episode.script.fullScript = fullScript.trim();
    episode.script.estimatedDurationSeconds = Math.max(15, Math.round(fullScript.trim().split(/\s+/).length / 2.55));
    episode.scriptVersion += 1;
    episode.approved = false;
    episode.qcStatus = 'pending';
    episode.status = 'script_ready';
  });
}

export async function regenerateScript(id: string) {
  const repository = getDailyHostRepository();
  const database = await repository.load();
  const episode = database.episodes.find((item) => item.id === id);
  if (!episode) throw new Error('Episode not found.');
  const script = await createScript({
    date: episode.episodeDate,
    event: episode.historicalEvent,
    word: episode.word,
    quote: episode.quote,
    desiredDuration: episode.durationTarget,
    tone: episode.tone,
  });
  return withEpisode(id, (next) => {
    next.script = script;
    next.scriptVersion += 1;
    next.approved = false;
    next.qcStatus = 'pending';
  });
}

export async function approveEpisode(id: string) {
  return withEpisode(id, (episode) => {
    episode.approved = true;
    episode.status = episode.qcStatus === 'pass' && episode.videoUrl ? 'ready_to_publish' : 'ready_for_review';
  });
}

export async function generateDemoVideo(id: string) {
  const repository = getDailyHostRepository();
  const { settings } = await repository.load();
  const result = await avatar.generateVideo({
    avatarId: settings.avatarId,
    script: '',
    aspectRatio: '9:16',
    duration: settings.durationTarget,
    resolution: '1080x1920',
    voiceId: settings.voiceId,
  });
  return withEpisode(id, (episode) => {
    markSteps(episode, ['voice', 'avatar', 'visuals', 'compose', 'captions'], 'completed');
    episode.status = 'ready_for_review';
    episode.generationStatus = result.status === 'completed' ? 'completed' : 'failed';
    episode.qcStatus = 'warning';
  });
}

export async function runQualityControl(id: string) {
  const repository = getDailyHostRepository();
  const { settings } = await repository.load();
  return withEpisode(id, (episode) => {
    const enoughSources = episode.historicalEvent.sources.length >= settings.requiredVerifiedSources;
    const passFacts = episode.historicalEvent.verified && enoughSources && episode.quote.verified;
    episode.qcStatus = !passFacts ? 'fail' : episode.videoUrl ? 'pass' : 'warning';
    episode.status = episode.qcStatus === 'fail' ? 'failed' : 'ready_for_review';
    markSteps(episode, ['qc'], 'completed');
  });
}

export async function simulatePublish(id: string, platform: SocialPlatform) {
  const repository = getDailyHostRepository();
  const database = await repository.load();
  const episode = database.episodes.find((item) => item.id === id);
  if (!episode) throw new Error('Episode not found.');
  if (!episode.approved) throw new Error('Approve the episode before simulating a post.');
  const post: SocialPost = {
    id: crypto.randomUUID(),
    episodeId: id,
    platform,
    status: 'simulated',
    createdAt: new Date().toISOString(),
    externalUrl: null,
  };
  await repository.createPost(post);
  await withEpisode(id, (next) => {
    next.publishingStatus = 'simulated';
    markSteps(next, ['publish'], 'completed');
  });
  return post;
}

export async function saveSettings(settings: DailyHostSettings) {
  return getDailyHostRepository().saveSettings(settings);
}

export async function runDailyHostAutomation(triggerSource: 'manual' | 'cron', now = new Date()) {
  const repository = getDailyHostRepository();
  const database = await repository.load();
  const date = isoDate(database.settings.timezone, now);
  const key = `daily-host:${date}`;
  if (triggerSource === 'cron') {
    const [currentHour, currentMinute] = localTime(database.settings.timezone, now).split(':').map(Number);
    const [targetHour, targetMinute] = database.settings.generationTime.split(':').map(Number);
    const delta = (currentHour ?? 0) * 60 + (currentMinute ?? 0) - ((targetHour ?? 0) * 60 + (targetMinute ?? 0));
    if (delta < 0 || delta >= 15) {
      const timestamp = new Date().toISOString();
      return {
        id: crypto.randomUUID(),
        episodeId: null,
        automationKey: `${key}:not-due:${localTime(database.settings.timezone, now)}`,
        triggerSource,
        status: 'skipped' as const,
        step: 'not_due',
        provider: 'daily-host',
        retry: 0,
        costUsd: 0,
        error: null,
        startedAt: timestamp,
        finishedAt: timestamp,
      };
    }
  }
  const previous = database.runs.find((run) => run.automationKey === key && run.status === 'completed');
  if (previous) return previous;
  const startedAt = new Date().toISOString();
  const run: AutomationRun = {
    id: crypto.randomUUID(),
    episodeId: null,
    automationKey: key,
    triggerSource,
    status: 'running',
    step: 'starting',
    provider: 'daily-host',
    retry: 0,
    costUsd: 0,
    error: null,
    startedAt,
    finishedAt: null,
  };
  if (database.settings.paused || database.settings.autonomyMode === 'off') {
    run.status = 'skipped';
    run.step = database.settings.paused ? 'paused' : 'autonomy_off';
    run.finishedAt = new Date().toISOString();
    return repository.createRun(run);
  }
  await repository.createRun(run);
  try {
    const episode = await generateEpisode({ date, automatic: true });
    run.episodeId = episode.id;
    run.status = 'completed';
    run.step = 'ready_for_review';
    run.finishedAt = new Date().toISOString();
    return repository.updateRun(run);
  } catch (error) {
    run.status = 'failed';
    run.step = 'generation';
    run.error = error instanceof Error ? error.message : 'Generation failed.';
    run.finishedAt = new Date().toISOString();
    await repository.updateRun(run);
    throw error;
  }
}

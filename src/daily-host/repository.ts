import 'server-only';

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createServiceSupabase } from '@/lib/supabase/service';
import type {
  AutomationRun,
  DailyEpisode,
  DailyHostDatabase,
  DailyHostSettings,
  SocialPost,
} from '@/daily-host/types';

export const defaultSettings: DailyHostSettings = {
  autonomyMode: 'review',
  paused: false,
  generationTime: '07:00',
  publishingTime: '08:00',
  timezone: 'America/Chicago',
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
  durationTarget: 55,
  tone: 'Cinematic and conversational',
  wordDifficulty: 'mixed',
  requiredVerifiedSources: 2,
  maxRegenerationAttempts: 2,
  autoRegenerateOnQcFailure: true,
  dailyBudgetUsd: 10,
  avatarProvider: 'demo',
  voiceProvider: 'browser',
  avatarId: '',
  voiceId: '',
  voiceSpeed: 1,
  socialEnabled: { youtube: false, tiktok: false, instagram: false, facebook: false, x: false },
};

const emptyDatabase = (): DailyHostDatabase => ({
  episodes: [],
  posts: [],
  runs: [],
  settings: structuredClone(defaultSettings),
  usedEventKeys: [],
  usedWordKeys: [],
  usedQuoteKeys: [],
});

export interface DailyHostRepository {
  readonly mode: 'supabase' | 'local';
  load(): Promise<DailyHostDatabase>;
  createEpisode(episode: DailyEpisode): Promise<DailyEpisode>;
  updateEpisode(episode: DailyEpisode): Promise<DailyEpisode>;
  saveSettings(settings: DailyHostSettings): Promise<DailyHostSettings>;
  createPost(post: SocialPost): Promise<SocialPost>;
  createRun(run: AutomationRun): Promise<AutomationRun>;
  updateRun(run: AutomationRun): Promise<AutomationRun>;
}

export class LocalDailyHostRepository implements DailyHostRepository {
  readonly mode = 'local' as const;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly filePath = process.env.DAILY_HOST_LOCAL_DATA_PATH ?? path.join(process.cwd(), '.data', 'daily-host.json')) {}

  async load(): Promise<DailyHostDatabase> {
    try {
      const parsed = JSON.parse(await readFile(this.filePath, 'utf8')) as Partial<DailyHostDatabase>;
      return { ...emptyDatabase(), ...parsed, settings: { ...defaultSettings, ...parsed.settings } };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyDatabase();
      throw error;
    }
  }

  private mutate<T>(operation: (database: DailyHostDatabase) => T): Promise<T> {
    const work = this.queue.then(async () => {
      const database = await this.load();
      const result = operation(database);
      await mkdir(path.dirname(this.filePath), { recursive: true });
      const temporary = `${this.filePath}.${process.pid}.tmp`;
      await writeFile(temporary, JSON.stringify(database, null, 2), 'utf8');
      await rename(temporary, this.filePath);
      return result;
    });
    this.queue = work.catch(() => undefined);
    return work;
  }

  createEpisode(episode: DailyEpisode) {
    return this.mutate((database) => {
      if (database.episodes.some((item) => item.idempotencyKey === episode.idempotencyKey)) {
        throw new Error('An episode already exists for this idempotency key.');
      }
      if (database.usedEventKeys.includes(episode.historicalEvent.normalizedKey)) throw new Error('Duplicate historical event.');
      if (database.usedWordKeys.includes(episode.word.normalizedKey)) throw new Error('Duplicate word.');
      if (database.usedQuoteKeys.includes(episode.quote.normalizedKey)) throw new Error('Duplicate quote.');
      database.episodes.unshift(episode);
      database.usedEventKeys.push(episode.historicalEvent.normalizedKey);
      database.usedWordKeys.push(episode.word.normalizedKey);
      database.usedQuoteKeys.push(episode.quote.normalizedKey);
      return episode;
    });
  }

  updateEpisode(episode: DailyEpisode) {
    return this.mutate((database) => {
      const index = database.episodes.findIndex((item) => item.id === episode.id);
      if (index < 0) throw new Error('Episode not found.');
      database.episodes[index] = episode;
      return episode;
    });
  }

  saveSettings(settings: DailyHostSettings) {
    return this.mutate((database) => {
      database.settings = settings;
      return settings;
    });
  }

  createPost(post: SocialPost) {
    return this.mutate((database) => {
      database.posts.unshift(post);
      return post;
    });
  }

  createRun(run: AutomationRun) {
    return this.mutate((database) => {
      if (database.runs.some((item) => item.automationKey === run.automationKey && item.status !== 'failed')) {
        throw new Error('Automation run already exists.');
      }
      database.runs.unshift(run);
      return run;
    });
  }

  updateRun(run: AutomationRun) {
    return this.mutate((database) => {
      const index = database.runs.findIndex((item) => item.id === run.id);
      if (index < 0) throw new Error('Automation run not found.');
      database.runs[index] = run;
      return run;
    });
  }
}

class SupabaseDailyHostRepository implements DailyHostRepository {
  readonly mode = 'supabase' as const;
  private get client() {
    const client = createServiceSupabase();
    if (!client) throw new Error('Supabase service credentials are not configured.');
    return client;
  }

  async load(): Promise<DailyHostDatabase> {
    const [episodes, posts, runs, settings] = await Promise.all([
      this.client.from('daily_episodes').select('payload').order('created_at', { ascending: false }),
      this.client.from('social_posts').select('payload').order('created_at', { ascending: false }),
      this.client.from('automation_runs').select('payload').order('started_at', { ascending: false }).limit(100),
      this.client.from('daily_host_settings').select('settings').eq('singleton_key', 'default').maybeSingle(),
    ]);
    const error = episodes.error ?? posts.error ?? runs.error ?? settings.error;
    if (error) throw new Error(`Daily Host database error: ${error.message}`);
    const episodeRows = (episodes.data ?? []).map((row) => row.payload as unknown as DailyEpisode);
    return {
      episodes: episodeRows,
      posts: (posts.data ?? []).map((row) => row.payload as unknown as SocialPost),
      runs: (runs.data ?? []).map((row) => row.payload as unknown as AutomationRun),
      settings: { ...defaultSettings, ...((settings.data?.settings ?? {}) as Partial<DailyHostSettings>) },
      usedEventKeys: episodeRows.map((item) => item.historicalEvent.normalizedKey),
      usedWordKeys: episodeRows.map((item) => item.word.normalizedKey),
      usedQuoteKeys: episodeRows.map((item) => item.quote.normalizedKey),
    };
  }

  async createEpisode(episode: DailyEpisode) {
    const { error } = await this.client.from('daily_episodes').insert(this.episodeRow(episode));
    if (error) throw new Error(`Unable to save episode: ${error.message}`);
    return episode;
  }

  async updateEpisode(episode: DailyEpisode) {
    const { error } = await this.client.from('daily_episodes').update(this.episodeRow(episode)).eq('id', episode.id);
    if (error) throw new Error(`Unable to update episode: ${error.message}`);
    return episode;
  }

  async saveSettings(settings: DailyHostSettings) {
    const { error } = await this.client.from('daily_host_settings').upsert({
      singleton_key: 'default',
      settings,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(`Unable to save settings: ${error.message}`);
    return settings;
  }

  async createPost(post: SocialPost) {
    const { error } = await this.client.from('social_posts').insert({
      id: post.id,
      episode_id: post.episodeId,
      platform: post.platform,
      status: post.status,
      external_url: post.externalUrl,
      payload: post,
    });
    if (error) throw new Error(`Unable to save social post: ${error.message}`);
    return post;
  }

  async createRun(run: AutomationRun) {
    const { error } = await this.client.from('automation_runs').insert(this.runRow(run));
    if (error) throw new Error(`Unable to create automation run: ${error.message}`);
    return run;
  }

  async updateRun(run: AutomationRun) {
    const { error } = await this.client.from('automation_runs').update(this.runRow(run)).eq('id', run.id);
    if (error) throw new Error(`Unable to update automation run: ${error.message}`);
    return run;
  }

  private episodeRow(episode: DailyEpisode) {
    return {
      id: episode.id,
      episode_date: episode.episodeDate,
      version: episode.version,
      idempotency_key: episode.idempotencyKey,
      calendar_month: episode.calendarMonth,
      calendar_day: episode.calendarDay,
      historical_event_id: episode.historicalEvent.id,
      historical_event_key: episode.historicalEvent.normalizedKey,
      historical_event_title: episode.historicalEvent.title,
      historical_event_year: episode.historicalEvent.year,
      historical_event_summary: episode.historicalEvent.summary,
      historical_event_source_urls: episode.historicalEvent.sources.map((source) => source.url),
      word: episode.word.word,
      word_key: episode.word.normalizedKey,
      word_definition: episode.word.definition,
      word_pronunciation: episode.word.pronunciation,
      word_part_of_speech: episode.word.partOfSpeech,
      word_example: episode.word.example,
      quote: episode.quote.quote,
      quote_key: episode.quote.normalizedKey,
      quote_author: episode.quote.author,
      script: episode.script.fullScript,
      script_version: episode.scriptVersion,
      duration_target: episode.durationTarget,
      video_url: episode.videoUrl,
      thumbnail_url: episode.thumbnailUrl,
      status: episode.status,
      generation_status: episode.generationStatus,
      qc_status: episode.qcStatus,
      publishing_status: episode.publishingStatus,
      manual_or_automatic: episode.manualOrAutomatic,
      published_at: episode.publishedAt,
      updated_at: episode.updatedAt,
      payload: episode,
    };
  }

  private runRow(run: AutomationRun) {
    return {
      id: run.id,
      episode_id: run.episodeId,
      automation_key: run.automationKey,
      trigger_source: run.triggerSource,
      status: run.status,
      step: run.step,
      provider: run.provider,
      retry: run.retry,
      cost_usd: run.costUsd,
      error: run.error,
      started_at: run.startedAt,
      finished_at: run.finishedAt,
      payload: run,
    };
  }
}

let repository: DailyHostRepository | undefined;

export function getDailyHostRepository(): DailyHostRepository {
  repository ??= createServiceSupabase() ? new SupabaseDailyHostRepository() : new LocalDailyHostRepository();
  return repository;
}

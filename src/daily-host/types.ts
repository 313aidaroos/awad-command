export type EpisodeStatus =
  | 'draft'
  | 'script_ready'
  | 'ready_for_review'
  | 'ready_to_publish'
  | 'published'
  | 'failed';

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'retrying' | 'skipped';
export type AutonomyMode = 'off' | 'review' | 'full';
export type ProviderState = 'connected' | 'demo' | 'not_configured' | 'error';

export interface HistoricalSource {
  title: string;
  url: string;
  publisher: string;
}

export interface HistoricalEvent {
  id: string;
  normalizedKey: string;
  month: number;
  day: number;
  year: number;
  title: string;
  summary: string;
  category: string;
  sources: HistoricalSource[];
  confidence: number;
  verified: boolean;
  score: number;
}

export interface DailyWord {
  id: string;
  normalizedKey: string;
  word: string;
  pronunciation: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  difficulty: 'accessible' | 'intermediate' | 'advanced';
  category: string;
}

export interface DailyQuote {
  id: string;
  normalizedKey: string;
  quote: string;
  author: string;
  source: string;
  category: string;
  verified: boolean;
}

export interface GeneratedScript {
  hook: string;
  historySegment: string;
  wordSegment: string;
  quoteSegment: string;
  closing: string;
  fullScript: string;
  estimatedDurationSeconds: number;
}

export interface PipelineStep {
  key: string;
  label: string;
  status: StepStatus;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}

export interface DailyEpisode {
  id: string;
  episodeDate: string;
  version: number;
  idempotencyKey: string;
  calendarMonth: number;
  calendarDay: number;
  historicalEvent: HistoricalEvent;
  word: DailyWord;
  quote: DailyQuote;
  script: GeneratedScript;
  scriptVersion: number;
  durationTarget: number;
  tone: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  status: EpisodeStatus;
  generationStatus: StepStatus;
  qcStatus: 'pending' | 'pass' | 'warning' | 'fail';
  publishingStatus: 'not_started' | 'simulated' | 'published' | 'blocked';
  approved: boolean;
  manualOrAutomatic: 'manual' | 'automatic';
  pipeline: PipelineStep[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface SocialPost {
  id: string;
  episodeId: string;
  platform: SocialPlatform;
  status: 'simulated' | 'published' | 'failed';
  createdAt: string;
  externalUrl: string | null;
}

export type SocialPlatform = 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'x';

export interface DailyHostSettings {
  autonomyMode: AutonomyMode;
  paused: boolean;
  generationTime: string;
  publishingTime: string;
  timezone: string;
  daysOfWeek: number[];
  durationTarget: number;
  tone: string;
  wordDifficulty: 'accessible' | 'intermediate' | 'advanced' | 'mixed';
  requiredVerifiedSources: number;
  maxRegenerationAttempts: number;
  autoRegenerateOnQcFailure: boolean;
  dailyBudgetUsd: number;
  avatarProvider: string;
  voiceProvider: string;
  avatarId: string;
  voiceId: string;
  voiceSpeed: number;
  socialEnabled: Record<SocialPlatform, boolean>;
}

export interface AutomationRun {
  id: string;
  episodeId: string | null;
  automationKey: string;
  triggerSource: 'manual' | 'cron';
  status: 'running' | 'completed' | 'failed' | 'skipped';
  step: string;
  provider: string;
  retry: number;
  costUsd: number;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface DailyHostSnapshot {
  storageMode: 'supabase' | 'local';
  episodes: DailyEpisode[];
  posts: SocialPost[];
  settings: DailyHostSettings;
  runs: AutomationRun[];
}

export interface DailyHostDatabase extends Omit<DailyHostSnapshot, 'storageMode'> {
  usedEventKeys: string[];
  usedWordKeys: string[];
  usedQuoteKeys: string[];
}

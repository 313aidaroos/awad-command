import { historicalEvents } from '@/daily-host/seeds';
import { z } from 'zod';
import type {
  DailyQuote,
  DailyWord,
  GeneratedScript,
  HistoricalEvent,
  ProviderState,
} from '@/daily-host/types';

export interface HistoricalResearchProvider {
  readonly name: string;
  readonly state: ProviderState;
  getEventsForDate(month: number, day: number): Promise<HistoricalEvent[]>;
  verifyEvent(event: HistoricalEvent): Promise<HistoricalEvent>;
  scoreEvent(event: HistoricalEvent): number;
  selectBestEvent(events: HistoricalEvent[], usedKeys: Set<string>): HistoricalEvent | null;
}

export interface ScriptGenerator {
  readonly name: string;
  readonly state: ProviderState;
  generate(input: {
    date: string;
    event: HistoricalEvent;
    word: DailyWord;
    quote: DailyQuote;
    desiredDuration: number;
    tone: string;
  }): Promise<GeneratedScript>;
}

export interface AvatarVideoProvider {
  readonly name: string;
  readonly state: ProviderState;
  generateVideo(input: {
    avatarId: string;
    script: string;
    aspectRatio: '9:16';
    duration: number;
    resolution: '1080x1920';
    voiceId: string;
  }): Promise<{ jobId: string; status: string; videoUrl: string | null; cost: number; provider: string }>;
}

export interface VoiceProvider {
  readonly name: string;
  readonly state: ProviderState;
}

export interface SocialPublisher {
  readonly platform: string;
  readonly state: ProviderState;
}

export interface VisualAssetProvider {
  readonly name: string;
  readonly state: ProviderState;
}

export class DemoHistoricalResearchProvider implements HistoricalResearchProvider {
  readonly name = 'Curated seed library';
  readonly state = 'demo' as const;

  async getEventsForDate(month: number, day: number) {
    const exact = historicalEvents.filter((item) => item.month === month && item.day === day);
    return exact.length ? exact : historicalEvents;
  }

  async verifyEvent(event: HistoricalEvent) {
    return event;
  }

  scoreEvent(event: HistoricalEvent) {
    const sourceScore = Math.min(10, event.sources.length * 4);
    return event.score + sourceScore + event.confidence * 10;
  }

  selectBestEvent(events: HistoricalEvent[], usedKeys: Set<string>) {
    return (
      events
        .filter((item) => item.verified && !usedKeys.has(item.normalizedKey))
        .sort((a, b) => this.scoreEvent(b) - this.scoreEvent(a))[0] ?? null
    );
  }
}

export class LocalScriptGenerator implements ScriptGenerator {
  readonly name = 'Local deterministic writer';
  readonly state = 'demo' as const;

  async generate({ event, word, quote, desiredDuration, tone }: Parameters<ScriptGenerator['generate']>[0]) {
    const hook = `On this day in history, ${event.month}/${event.day} in ${event.year}—${event.title}.`;
    const historySegment = `${event.summary} It is a ${tone.toLowerCase()} reminder that one moment can keep echoing through history.`;
    const wordSegment = `Word of the day: ${word.word}, pronounced ${word.pronunciation}. It is a ${word.partOfSpeech} meaning ${word.definition.toLowerCase()} For example: ${word.example}`;
    const quoteSegment = `Quote of the day, from ${quote.author}: “${quote.quote}”`;
    const closing = 'Carry that thought with you. See you tomorrow.';
    const fullScript = [hook, historySegment, wordSegment, quoteSegment, closing].join(' ');
    return {
      hook,
      historySegment,
      wordSegment,
      quoteSegment,
      closing,
      fullScript,
      estimatedDurationSeconds: Math.min(desiredDuration + 8, Math.max(30, Math.round(fullScript.split(/\s+/).length / 2.55))),
    };
  }
}

const GeneratedScriptSchema = z.object({
  hook: z.string(),
  historySegment: z.string(),
  wordSegment: z.string(),
  quoteSegment: z.string(),
  closing: z.string(),
  fullScript: z.string(),
  estimatedDurationSeconds: z.number().min(20).max(90),
});

export class AnthropicScriptGenerator implements ScriptGenerator {
  readonly name = 'Anthropic';
  readonly state = 'connected' as const;

  async generate(input: Parameters<ScriptGenerator['generate']>[0]) {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 900,
      system: 'You write accurate, natural short-form history scripts. Return only valid JSON with hook, historySegment, wordSegment, quoteSegment, closing, fullScript, estimatedDurationSeconds. Do not add facts beyond the supplied verified record.',
      messages: [{ role: 'user', content: JSON.stringify(input) }],
    });
    const text = response.content.filter((block) => block.type === 'text').map((block) => block.text).join('');
    return GeneratedScriptSchema.parse(JSON.parse(text.replace(/^```json\s*|\s*```$/g, '')));
  }
}

export function getScriptGenerator(): ScriptGenerator {
  return process.env.ANTHROPIC_API_KEY ? new AnthropicScriptGenerator() : new LocalScriptGenerator();
}

export class DemoAvatarProvider implements AvatarVideoProvider {
  readonly name = 'Interactive scene preview';
  readonly state = 'demo' as const;

  async generateVideo() {
    return {
      jobId: `demo-${crypto.randomUUID()}`,
      status: 'completed',
      videoUrl: null,
      cost: 0,
      provider: this.name,
    };
  }
}

export const providerStatuses = () => ({
  database: process.env.SUPABASE_SERVICE_ROLE_KEY ? ('connected' as const) : ('demo' as const),
  aiWriter: process.env.ANTHROPIC_API_KEY ? ('connected' as const) : ('demo' as const),
  historicalResearch: 'demo' as const,
  avatarGenerator: 'not_configured' as const,
  voiceGenerator: 'demo' as const,
  videoComposer: 'demo' as const,
  youtube: 'not_configured' as const,
  tiktok: 'not_configured' as const,
  instagram: 'not_configured' as const,
  facebook: 'not_configured' as const,
  x: 'not_configured' as const,
});

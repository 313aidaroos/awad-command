import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  approveEpisode,
  generateDemoVideo,
  generateEpisode,
  getDailyHostSnapshot,
  regenerateScript,
  runDailyHostAutomation,
  runQualityControl,
  saveScript,
  saveSettings,
  simulatePublish,
} from '@/daily-host/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SettingsSchema = z.object({
  autonomyMode: z.enum(['off', 'review', 'full']),
  paused: z.boolean(),
  generationTime: z.string().regex(/^\d{2}:\d{2}$/),
  publishingTime: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().min(1).max(100),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
  durationTarget: z.number().int().min(30).max(90),
  tone: z.string().min(1).max(120),
  wordDifficulty: z.enum(['accessible', 'intermediate', 'advanced', 'mixed']),
  requiredVerifiedSources: z.number().int().min(1).max(5),
  maxRegenerationAttempts: z.number().int().min(0).max(5),
  autoRegenerateOnQcFailure: z.boolean(),
  dailyBudgetUsd: z.number().min(0).max(1000),
  avatarProvider: z.string().max(80),
  voiceProvider: z.string().max(80),
  avatarId: z.string().max(200),
  voiceId: z.string().max(200),
  voiceSpeed: z.number().min(0.5).max(2),
  socialEnabled: z.object({
    youtube: z.boolean(),
    tiktok: z.boolean(),
    instagram: z.boolean(),
    facebook: z.boolean(),
    x: z.boolean(),
  }),
});

const ActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('generate'), alternate: z.boolean().optional() }),
  z.object({ action: z.literal('save_script'), id: z.string().uuid(), script: z.string() }),
  z.object({ action: z.literal('regenerate_script'), id: z.string().uuid() }),
  z.object({ action: z.literal('approve'), id: z.string().uuid() }),
  z.object({ action: z.literal('generate_video'), id: z.string().uuid() }),
  z.object({ action: z.literal('qc'), id: z.string().uuid() }),
  z.object({
    action: z.literal('simulate_publish'),
    id: z.string().uuid(),
    platform: z.enum(['youtube', 'tiktok', 'instagram', 'facebook', 'x']),
  }),
  z.object({ action: z.literal('save_settings'), settings: SettingsSchema }),
  z.object({ action: z.literal('run_automation') }),
]);

export async function GET() {
  try {
    return NextResponse.json(await getDailyHostSnapshot());
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = ActionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid Daily Host request.', issues: parsed.error.flatten() }, { status: 400 });
    }
    const input = parsed.data;
    switch (input.action) {
      case 'generate':
        return NextResponse.json(await generateEpisode({ alternate: input.alternate }));
      case 'save_script':
        return NextResponse.json(await saveScript(input.id, input.script));
      case 'regenerate_script':
        return NextResponse.json(await regenerateScript(input.id));
      case 'approve':
        return NextResponse.json(await approveEpisode(input.id));
      case 'generate_video':
        return NextResponse.json(await generateDemoVideo(input.id));
      case 'qc':
        return NextResponse.json(await runQualityControl(input.id));
      case 'simulate_publish':
        return NextResponse.json(await simulatePublish(input.id, input.platform));
      case 'save_settings':
        return NextResponse.json(await saveSettings(input.settings));
      case 'run_automation':
        return NextResponse.json(await runDailyHostAutomation('manual'));
    }
  } catch (error) {
    return failure(error);
  }
}

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : 'Daily Host request failed.';
  const status = /not found/i.test(message) ? 404 : /paused|approve|duplicate|exhausted|invalid/i.test(message) ? 409 : 500;
  return NextResponse.json({ error: message }, { status });
}

import { afterEach, describe, expect, it } from 'vitest';
import { anthropicApiKey, anthropicModel, isAnthropicCeoEnabled } from '@/lib/env';

afterEach(() => {
  delete process.env.AI_PROVIDER;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_MODEL;
});

describe('anthropicModel', () => {
  it('defaults to the current Claude API Sonnet id when unset', () => {
    delete process.env.ANTHROPIC_MODEL;
    expect(anthropicModel()).toBe('claude-sonnet-5');
  });

  it('uses ANTHROPIC_MODEL when set, trimming quotes and space', () => {
    process.env.ANTHROPIC_MODEL = '  "claude-sonnet-4-6"  ';
    expect(anthropicModel()).toBe('claude-sonnet-4-6');
  });
});

describe('isAnthropicCeoEnabled', () => {
  it('is off when provider or key is missing', () => {
    expect(isAnthropicCeoEnabled()).toBe(false);
    process.env.AI_PROVIDER = 'anthropic';
    expect(isAnthropicCeoEnabled()).toBe(false);
    delete process.env.AI_PROVIDER;
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    expect(isAnthropicCeoEnabled()).toBe(false);
  });

  it('is off for empty or whitespace-only values', () => {
    process.env.AI_PROVIDER = 'anthropic';
    process.env.ANTHROPIC_API_KEY = '';
    expect(isAnthropicCeoEnabled()).toBe(false);
    process.env.ANTHROPIC_API_KEY = '   ';
    expect(isAnthropicCeoEnabled()).toBe(false);
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    process.env.AI_PROVIDER = '   ';
    expect(isAnthropicCeoEnabled()).toBe(false);
  });

  it('treats AI_PROVIDER as case-insensitive and trims wrapping quotes/space', () => {
    process.env.AI_PROVIDER = ' ANTHROPIC ';
    process.env.ANTHROPIC_API_KEY = '  sk-test  ';
    expect(isAnthropicCeoEnabled()).toBe(true);
    expect(anthropicApiKey()).toBe('sk-test');

    process.env.AI_PROVIDER = '"Anthropic"';
    process.env.ANTHROPIC_API_KEY = "'sk-quoted'";
    expect(isAnthropicCeoEnabled()).toBe(true);
    expect(anthropicApiKey()).toBe('sk-quoted');
  });

  it('ignores other providers even when a key is set', () => {
    process.env.AI_PROVIDER = 'demo';
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    expect(isAnthropicCeoEnabled()).toBe(false);
  });
});

describe('auth configuration', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.ALLOWED_EMAIL;
  });

  it('gates the deck when Supabase is configured, defaulting owner/admin to awad@apixis.dev', async () => {
    const { allowedEmail, isAuthConfigured } = await import('@/lib/env');
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    expect(allowedEmail()).toBe('awad@apixis.dev');
    expect(isAuthConfigured()).toBe(true);
  });
});

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

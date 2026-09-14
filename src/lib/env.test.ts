import { afterEach, describe, expect, it } from 'vitest';
import { anthropicApiKey, isAnthropicCeoEnabled } from '@/lib/env';

afterEach(() => {
  delete process.env.AI_PROVIDER;
  delete process.env.ANTHROPIC_API_KEY;
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

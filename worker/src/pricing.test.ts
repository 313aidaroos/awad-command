import { describe, expect, it } from 'vitest';
import { costUsd, priceForModel } from './pricing.js';

describe('pricing', () => {
  it('uses the shared sonnet table for known models', () => {
    expect(priceForModel('claude-sonnet-5')).toEqual({ inputPerMTok: 3, outputPerMTok: 15 });
    expect(priceForModel('unknown-model')).toEqual(priceForModel('claude-sonnet-5'));
  });

  it('converts tokens to dollars', () => {
    expect(costUsd('claude-sonnet-5', 1_000_000, 0)).toBe(3);
    expect(costUsd('claude-sonnet-5', 0, 1_000_000)).toBe(15);
    expect(costUsd('claude-sonnet-5', 500_000, 100_000)).toBeCloseTo(3);
  });
});

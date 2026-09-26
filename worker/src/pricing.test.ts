import { describe, expect, it } from 'vitest';
import { costUsd, priceForModel } from './pricing.js';

describe('pricing', () => {
  it('uses the shared sonnet table for known models', () => {
    expect(priceForModel('claude-sonnet-5')).toEqual({ inputPerMTok: 2, outputPerMTok: 10 });
    expect(priceForModel('unknown-model')).toEqual({ inputPerMTok: 3, outputPerMTok: 15 });
  });

  it('converts tokens to dollars', () => {
    expect(costUsd('claude-sonnet-5', 1_000_000, 0)).toBe(2);
    expect(costUsd('claude-sonnet-5', 0, 1_000_000)).toBe(10);
    expect(costUsd('claude-sonnet-5', 500_000, 100_000)).toBeCloseTo(2);
  });
});

import { describe, expect, it } from 'vitest';
import { INTERIOR_EXPOSURE, UNIVERSE_EXPOSURE } from '@/scene/lib/exposure';

describe('exposure', () => {
  it('keeps the film response under 1 so metals do not blow out', () => {
    expect(UNIVERSE_EXPOSURE).toBeLessThan(1);
    expect(INTERIOR_EXPOSURE).toBeLessThan(1);
    expect(INTERIOR_EXPOSURE).toBeGreaterThan(UNIVERSE_EXPOSURE);
  });
});

import { describe, expect, it } from 'vitest';
import { identityOf, plazaSlugs } from '@/scene/universe/identities';

describe('plaza identities', () => {
  it('keeps 5–7 distinct plaza vessels', () => {
    const slugs = plazaSlugs();
    expect(slugs.length).toBeGreaterThanOrEqual(5);
    expect(slugs.length).toBeLessThanOrEqual(7);
    const kinds = new Set(slugs.map((slug) => identityOf(slug).kind));
    expect(kinds.size).toBe(slugs.length);
  });

  it('places Contraxis off the CEO hero line', () => {
    const pos = identityOf('contraxis').plazaPosition;
    expect(pos?.[0]).toBeGreaterThan(6);
  });
});

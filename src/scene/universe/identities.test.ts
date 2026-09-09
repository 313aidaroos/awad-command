import { describe, expect, it } from 'vitest';
import { identityOf, plazaSlugs } from '@/scene/universe/identities';

describe('plaza identities', () => {
  it('keeps the nine mock realm islands on the plaza', () => {
    const slugs = plazaSlugs();
    expect(slugs).toHaveLength(9);
    const kinds = new Set(slugs.map((slug) => identityOf(slug).kind));
    expect(kinds.size).toBeGreaterThanOrEqual(5);
  });

  it('places Contraxis off the palace hero line', () => {
    const pos = identityOf('contraxis').plazaPosition;
    expect(pos?.[0]).toBeGreaterThan(6);
  });

  it('keeps realm islands away from the palace', () => {
    for (const slug of plazaSlugs()) {
      const pos = identityOf(slug).plazaPosition!;
      expect(Math.hypot(pos[0], pos[2])).toBeGreaterThan(16);
    }
  });
});

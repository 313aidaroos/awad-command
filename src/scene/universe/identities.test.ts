import { describe, expect, it } from 'vitest';
import { listProjectSlugs } from '@/projects/registry';
import { identityOf, listedIdentities, onPlaza, plazaSlugs } from '@/scene/universe/identities';

describe('project vessel identities', () => {
  it('assigns an architectural vessel to every registered project', () => {
    for (const slug of listProjectSlugs()) {
      const identity = identityOf(slug);
      expect(identity.kind).toBeTruthy();
      expect(identity.scale).toBeGreaterThan(0.7);
      expect(identity.scale).toBeLessThan(2.4);
    }
    expect(Object.keys(listedIdentities()).length).toBeGreaterThanOrEqual(listProjectSlugs().length);
  });

  it('keeps the plaza to five large signature vessels', () => {
    expect(plazaSlugs()).toEqual(['contraxis', 'socixis', 'rawixis', 'awadbot', 'apixis']);
    const kinds = new Set(plazaSlugs().map((slug) => identityOf(slug).kind));
    expect(kinds.size).toBe(5);
    expect(identityOf('contraxis').kind).toBe('hall');
    expect(identityOf('contraxis').scale).toBeGreaterThan(identityOf('socixis').scale);
    expect(onPlaza('publishing')).toBe(false);
    expect(identityOf('missing-world').plaza).toBe(false);
  });
});

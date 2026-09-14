import { describe, expect, it } from 'vitest';
import { listProjectSlugs } from '@/projects/registry';
import { identityOf, listedIdentities } from '@/scene/universe/identities';

describe('project entity identities', () => {
  it('assigns a quiet monument to every registered project', () => {
    const used = new Set<string>();
    for (const slug of listProjectSlugs()) {
      const identity = identityOf(slug);
      expect(identity.kind).toBeTruthy();
      expect(identity.rings).toBe(0);
      expect(identity.scale).toBeGreaterThan(0.25);
      expect(identity.scale).toBeLessThan(0.95);
      used.add(`${identity.kind}:${slug}`);
    }
    expect(used.size).toBe(listProjectSlugs().length);
  });

  it('keeps Contraxis as the cubic station, larger than other monuments', () => {
    expect(identityOf('contraxis').kind).toBe('lattice');
    expect(identityOf('missing-world').kind).toBe('soft');
    const contra = identityOf('contraxis').scale;
    for (const slug of listProjectSlugs()) {
      if (slug === 'contraxis') continue;
      expect(identityOf(slug).scale).toBeLessThan(contra);
    }
    expect(Object.keys(listedIdentities()).length).toBeGreaterThanOrEqual(listProjectSlugs().length);
  });
});

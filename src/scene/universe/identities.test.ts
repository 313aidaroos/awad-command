import { describe, expect, it } from 'vitest';
import { listProjectSlugs } from '@/projects/registry';
import { identityOf, listedIdentities } from '@/scene/universe/identities';

describe('project entity identities', () => {
  it('assigns a distinct silhouette to every registered project', () => {
    const used = new Set<string>();
    for (const slug of listProjectSlugs()) {
      const identity = identityOf(slug);
      expect(identity.kind).toBeTruthy();
      expect(identity.scale).toBeGreaterThan(0.9);
      used.add(`${identity.kind}:${slug}`);
    }
    expect(used.size).toBe(listProjectSlugs().length);
  });

  it('keeps Contraxis as the cubic station and does not default unknown slugs to lattice', () => {
    expect(identityOf('contraxis').kind).toBe('lattice');
    expect(identityOf('missing-world').kind).toBe('soft');
    expect(Object.keys(listedIdentities()).length).toBeGreaterThanOrEqual(listProjectSlugs().length);
  });
});

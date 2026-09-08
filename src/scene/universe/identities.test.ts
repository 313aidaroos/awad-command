import { describe, expect, it } from 'vitest';
import { listProjectSlugs } from '@/projects/registry';
import { identityOf, listedIdentities } from '@/scene/universe/identities';

describe('project vessel identities', () => {
  it('assigns a distinct architectural vessel to every registered project', () => {
    const kinds = new Set<string>();
    for (const slug of listProjectSlugs()) {
      const identity = identityOf(slug);
      expect(identity.kind).toBeTruthy();
      expect(identity.scale).toBeGreaterThan(0.7);
      expect(identity.scale).toBeLessThan(2.2);
      kinds.add(identity.kind);
    }
    expect(kinds.size).toBe(listProjectSlugs().length);
  });

  it('keeps Contraxis as the hall pavilion, larger than annexes', () => {
    expect(identityOf('contraxis').kind).toBe('hall');
    expect(identityOf('missing-world').kind).toBe('tent');
    const contra = identityOf('contraxis').scale;
    expect(identityOf('publishing').scale).toBeLessThan(contra);
    expect(Object.keys(listedIdentities()).length).toBeGreaterThanOrEqual(listProjectSlugs().length);
  });
});

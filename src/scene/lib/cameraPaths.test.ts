import { describe, expect, it } from 'vitest';
import { contraxis } from '@/projects/contraxis';
import {
  outsideChamber,
  projectEnterSequence,
  showExterior,
} from '@/scene/lib/cameraPaths';

describe('project enter camera', () => {
  it('never parks inside a 3-unit selection bubble of Contraxis', () => {
    const origin = contraxis.universePosition;
    const sequence = projectEnterSequence(origin);
    expect(sequence.map((step) => step.phase)).toEqual(['approach', 'shell', 'interior']);
    for (const step of sequence) {
      expect(outsideChamber(step.position, origin)).toBe(true);
    }
    const interior = sequence[2];
    const dx = (interior?.position[0] ?? 0) - origin[0];
    const dz = (interior?.position[2] ?? 0) - origin[2];
    expect(Math.hypot(dx, dz)).toBeGreaterThan(6);
    expect(Math.hypot(dx, dz)).toBeLessThan(13.5);
  });

  it('hides the exterior graph once the hangar takes over', () => {
    expect(showExterior('universe')).toBe(true);
    expect(showExterior('approach')).toBe(true);
    expect(showExterior('shell')).toBe(false);
    expect(showExterior('interior')).toBe(false);
  });
});

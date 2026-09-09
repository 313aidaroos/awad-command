import { describe, expect, it } from 'vitest';
import { hideVesselForCeoInspect, occludesCeoFace } from '@/scene/lib/labelBudget';

describe('ceo label collision', () => {
  it('hides ship names that sit on the CEO face', () => {
    expect(occludesCeoFace({ id: 'vessel-halaxis', x: 0.08, y: -0.04, priority: 2 })).toBe(true);
    expect(occludesCeoFace({ id: 'ceo-core', x: 0, y: 0.2, priority: 4 })).toBe(false);
  });

  it('hides vessel labels while the camera inspects the CEO', () => {
    expect(hideVesselForCeoInspect({ id: 'vessel-apixis', priority: 2 }, 8)).toBe(true);
    expect(hideVesselForCeoInspect({ id: 'vessel-apixis', priority: 2 }, 22)).toBe(false);
    expect(hideVesselForCeoInspect({ id: 'ceo-core', priority: 4 }, 8)).toBe(false);
  });
});

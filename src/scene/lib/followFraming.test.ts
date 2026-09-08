import { describe, expect, it } from 'vitest';
import { FOLLOW_NDC_TARGET, followCorrections } from '@/scene/lib/followFraming';

describe('followCorrections', () => {
  it('does not fight a centered subject', () => {
    const result = followCorrections(FOLLOW_NDC_TARGET, 0);
    expect(result.lookLift).toBe(0);
    expect(result.camDrop).toBe(0);
    expect(result.pullBack).toBe(0);
  });

  it('looks up and drops the camera when the subject clips the top', () => {
    const result = followCorrections(0.72, 0);
    expect(result.lookLift).toBeGreaterThan(1);
    expect(result.camDrop).toBeGreaterThan(0.8);
    expect(result.pullBack).toBeGreaterThan(2);
  });

  it('does not raise look-at when the subject sits in the upper third with margin', () => {
    const result = followCorrections(0.28, 0.1);
    expect(result.lookLift).toBe(0);
    expect(result.camDrop).toBe(0);
  });

  it('pulls back when the subject is off the side', () => {
    const result = followCorrections(0.1, 0.7);
    expect(result.pullBack).toBeGreaterThan(1);
  });
});

import { describe, expect, it } from 'vitest';
import {
  CEO_CLOSE_CAM,
  CONTRAXIS_HALL_CAM,
  projectEnterSequence,
  projectInteriorCam,
  showExterior,
} from '@/scene/lib/cameraPaths';

describe('projectEnterSequence', () => {
  it('cuts Contraxis straight into the sealed hall', () => {
    const sequence = projectEnterSequence([11, 0, 12], 'contraxis');
    expect(sequence).toHaveLength(1);
    expect(sequence[0]).toMatchObject({
      phase: 'interior',
      cut: true,
      position: CONTRAXIS_HALL_CAM.position,
    });
    const [x, y, z] = sequence[0]!.position;
    expect(Math.abs(x)).toBeLessThan(9.5);
    expect(Math.abs(z)).toBeLessThan(9.5);
    expect(y).toBeGreaterThan(1);
    expect(y).toBeLessThan(3.2);
  });

  it('lands other worlds in a populated chamber at the origin', () => {
    const sequence = projectEnterSequence([4, 1, -3], 'socixis');
    expect(sequence[0]?.phase).toBe('interior');
    expect(sequence[0]?.cut).toBe(true);
  });
});

describe('showExterior', () => {
  it('hides the plaza once the camera is inside', () => {
    expect(showExterior('universe')).toBe(true);
    expect(showExterior('interior')).toBe(false);
    expect(showExterior('shell')).toBe(false);
  });
});

describe('CEO_CLOSE_CAM', () => {
  it('stays on the plaza looking at the core', () => {
    expect(CEO_CLOSE_CAM.phase).toBe('universe');
    const [x, y, z] = CEO_CLOSE_CAM.position;
    expect(Math.hypot(x, z)).toBeGreaterThan(6);
    expect(Math.hypot(x, z)).toBeLessThan(12);
    expect(y).toBeGreaterThan(2);
    expect(y).toBeLessThan(5);
  });
});

describe('projectInteriorCam', () => {
  it('returns the Contraxis hall for follow stop', () => {
    expect(projectInteriorCam([0, 0, 0], 'contraxis').lookAt).toEqual(CONTRAXIS_HALL_CAM.lookAt);
  });
});

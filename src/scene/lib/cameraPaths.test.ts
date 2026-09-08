import { describe, expect, it } from 'vitest';
import { CONTRAXIS_HALL_CAM, projectEnterSequence, projectInteriorCam, showExterior, UNIVERSE_CAM } from '@/scene/lib/cameraPaths';

describe('camera paths', () => {
  it('keeps the exterior mounted on universe and approach only', () => {
    expect(showExterior('universe')).toBe(true);
    expect(showExterior('approach')).toBe(true);
    expect(showExterior('shell')).toBe(false);
    expect(showExterior('interior')).toBe(false);
  });

  it('cuts Contraxis into the sealed hall at the origin, not the plaza vessel', () => {
    const pos: [number, number, number] = [7.4, 0, 6.8];
    const sequence = projectEnterSequence(pos, 'contraxis');
    expect(sequence).toHaveLength(3);
    expect(sequence[0]?.phase).toBe('approach');
    expect(sequence[1]?.cut).toBe(true);
    expect(sequence[1]?.phase).toBe('shell');
    const interior = sequence[2]!;
    expect(interior.cut).toBe(true);
    expect(interior.phase).toBe('interior');
    expect(Math.abs(interior.position[0])).toBeLessThan(16);
    expect(Math.abs(interior.position[2])).toBeLessThan(5);
    expect(interior.lookAt[0]).toBeGreaterThan(interior.position[0]);
    expect(projectInteriorCam(pos, 'contraxis').position).toEqual(CONTRAXIS_HALL_CAM.position);
  });

  it('starts from a product-film universe camera, not a space-god view', () => {
    expect(UNIVERSE_CAM.position[1]).toBeLessThan(8);
    expect(UNIVERSE_CAM.position[2]).toBeLessThan(28);
    expect(UNIVERSE_CAM.lookAt[1]).toBeGreaterThan(0.5);
  });
});

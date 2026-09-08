import { describe, expect, it } from 'vitest';
import { projectEnterSequence, projectInteriorCam, showExterior, UNIVERSE_CAM } from '@/scene/lib/cameraPaths';

describe('camera paths', () => {
  it('keeps the exterior mounted on universe and approach only', () => {
    expect(showExterior('universe')).toBe(true);
    expect(showExterior('approach')).toBe(true);
    expect(showExterior('shell')).toBe(false);
    expect(showExterior('interior')).toBe(false);
  });

  it('lands Contraxis inside the hall looking down the spine', () => {
    const pos: [number, number, number] = [7.4, 0, 6.8];
    const sequence = projectEnterSequence(pos, 'contraxis');
    expect(sequence).toHaveLength(3);
    expect(sequence[0]?.phase).toBe('approach');
    expect(sequence[2]?.phase).toBe('interior');
    const interior = sequence[2]!;
    expect(interior.position[0]).toBeLessThan(pos[0]);
    expect(interior.lookAt[0]).toBeGreaterThan(interior.position[0]);
    expect(projectInteriorCam(pos, 'contraxis').phase).toBe('interior');
  });

  it('starts from a product-film universe camera, not a space-god view', () => {
    expect(UNIVERSE_CAM.position[1]).toBeLessThan(8);
    expect(UNIVERSE_CAM.position[2]).toBeLessThan(30);
    expect(UNIVERSE_CAM.lookAt[1]).toBeGreaterThan(0.5);
  });
});

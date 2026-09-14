import { describe, expect, it } from 'vitest';
import { fillBrushRoughness, fillGraphiteAlbedo, fillNormalFromHeight, hash21 } from '@/scene/kit/pbrMaps';

describe('procedural PBR maps', () => {
  it('hash is deterministic and in 0..1', () => {
    expect(hash21(3, 7, 1.2)).toBe(hash21(3, 7, 1.2));
    expect(hash21(3, 7, 1.2)).toBeGreaterThanOrEqual(0);
    expect(hash21(3, 7, 1.2)).toBeLessThan(1);
  });

  it('brush roughness stays in a glossy metal band', () => {
    const size = 32;
    const data = new Uint8Array(size * size * 4);
    fillBrushRoughness(data, size);
    let min = 255;
    let max = 0;
    for (let i = 0; i < data.length; i += 4) {
      min = Math.min(min, data[i]!);
      max = Math.max(max, data[i]!);
    }
    expect(min).toBeGreaterThan(15);
    expect(max).toBeLessThan(120);
    expect(max - min).toBeGreaterThan(18);
  });

  it('graphite albedo stays in a dark metal range', () => {
    const size = 16;
    const data = new Uint8Array(size * size * 4);
    fillGraphiteAlbedo(data, size);
    expect(data[0]).toBeGreaterThan(20);
    expect(data[0]).toBeLessThan(90);
  });

  it('normals encode a unit-ish blue-forward map', () => {
    const size = 8;
    const height = new Uint8Array(size * size * 4);
    fillBrushRoughness(height, size);
    const nrm = new Uint8Array(size * size * 4);
    fillNormalFromHeight(nrm, height, size);
    expect(nrm[2]).toBeGreaterThan(120);
  });
});

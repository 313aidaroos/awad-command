import { describe, expect, it } from 'vitest';
import { CONTRAXIS_HALL_CAM, projectEnterSequence, projectInteriorCam, showExterior, UNIVERSE_CAM } from '@/scene/lib/cameraPaths';
import { useCommandStore } from '@/store/useCommandStore';

describe('camera paths', () => {
  it('keeps the exterior mounted on universe and approach only', () => {
    expect(showExterior('universe')).toBe(true);
    expect(showExterior('approach')).toBe(true);
    expect(showExterior('shell')).toBe(false);
    expect(showExterior('interior')).toBe(false);
  });

  it('cuts Contraxis into the sealed hall in one step — no plaza approach', () => {
    const pos: [number, number, number] = [7.4, 0, 6.8];
    const sequence = projectEnterSequence(pos, 'contraxis');
    expect(sequence).toHaveLength(1);
    const interior = sequence[0]!;
    expect(interior.cut).toBe(true);
    expect(interior.phase).toBe('interior');
    expect(interior.position[0]).toBeGreaterThan(-16);
    expect(interior.position[0]).toBeLessThan(-6);
    expect(Math.abs(interior.position[2])).toBeLessThan(4);
    expect(interior.lookAt[0]).toBeGreaterThan(interior.position[0]);
    expect(projectInteriorCam(pos, 'contraxis').position).toEqual(CONTRAXIS_HALL_CAM.position);
  });

  it('sets enterPhase to interior when Contraxis is entered', () => {
    useCommandStore.setState({ view: 'universe', focusedProject: undefined, enterPhase: 'universe' });
    useCommandStore.getState().initFromRegistry();
    useCommandStore.getState().enterProject('contraxis');
    const state = useCommandStore.getState();
    expect(state.enterPhase).toBe('interior');
    expect(state.view).toBe('project');
    expect(state.camera.target?.cut).toBe(true);
    expect(state.camera.target?.phase).toBe('interior');
  });

  it('starts from a product-film universe camera, not a space-god view', () => {
    expect(UNIVERSE_CAM.position[1]).toBeLessThan(8);
    expect(UNIVERSE_CAM.position[2]).toBeLessThan(28);
    expect(UNIVERSE_CAM.lookAt[1]).toBeGreaterThan(0.5);
  });
});

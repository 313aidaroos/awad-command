import type { CameraTarget } from '@/store/types';

export const UNIVERSE_ZOOM = 16;
export const INTERIOR_ORIGIN: [number, number, number] = [0, 0, 0];

export const UNIVERSE_CAM: CameraTarget = {
  position: [0, 6.2, UNIVERSE_ZOOM],
  lookAt: [0, 0.9, 0],
  duration: 1.6,
  phase: 'universe',
};

/**
 * Standing inside the MegaKit hall (−10..10 x, −6..6 z).
 * Must stay inside that volume or the camera sees a wall as a grey field.
 */
export const CONTRAXIS_HALL_CAM: CameraTarget = {
  position: [-6.55, 2.05, 2.35],
  lookAt: [3.8, 1.05, 0],
  duration: 0.01,
  phase: 'interior',
  cut: true,
};

export const GENERIC_HALL_CAM: CameraTarget = {
  position: [4.6, 2.2, 5.4],
  lookAt: [0, 0.85, 0],
  duration: 0.01,
  phase: 'interior',
  cut: true,
};

export function showExterior(enterPhase: CameraTarget['phase'] | string): boolean {
  return enterPhase === 'universe' || enterPhase === 'approach';
}

export function projectEnterSequence(
  _pos: [number, number, number],
  slug?: string,
): CameraTarget[] {
  if (slug === 'contraxis') return [CONTRAXIS_HALL_CAM];
  return [GENERIC_HALL_CAM];
}

export function projectInteriorCam(pos: [number, number, number], slug?: string): CameraTarget {
  const sequence = projectEnterSequence(pos, slug);
  return sequence[sequence.length - 1] ?? UNIVERSE_CAM;
}

import type { CameraTarget } from '@/store/types';

export const UNIVERSE_ZOOM = 15;
export const INTERIOR_ZOOM = 11;

/** Sealed interiors live at the world origin so the camera cannot miss them. */
export const INTERIOR_ORIGIN: [number, number, number] = [0, 0, 0];

export const UNIVERSE_CAM: CameraTarget = {
  position: [0, 3.15, UNIVERSE_ZOOM],
  lookAt: [0, 1.35, 0],
  duration: 1.8,
  phase: 'universe',
};

function dirOf(pos: [number, number, number]): [number, number, number] {
  const len = Math.max(0.001, Math.hypot(pos[0], pos[2]));
  return [pos[0] / len, 0, pos[2] / len];
}

export function showExterior(enterPhase: CameraTarget['phase'] | string): boolean {
  return enterPhase === 'universe' || enterPhase === 'approach';
}

/**
 * Standing in the nave, looking +X down the Customer→Revenue spine.
 * Must stay inside x∈(-17,17), z∈(-6.2,6.2) or the camera sees a wall as a grey field.
 */
export const CONTRAXIS_HALL_CAM: CameraTarget = {
  position: [-10.6, 2.05, 1.85],
  lookAt: [5.2, 1.15, 0],
  duration: 0.01,
  phase: 'interior',
  cut: true,
};

export function projectEnterSequence(
  pos: [number, number, number],
  slug?: string,
): CameraTarget[] {
  if (slug === 'contraxis') {
    return [CONTRAXIS_HALL_CAM];
  }
  const [x, y, z] = pos;
  const [dx, , dz] = dirOf(pos);
  return [
    {
      position: [x + dx * 8.2, y + 3.6, z + dz * 8.2],
      lookAt: [x, y + 1.2, z],
      duration: 1.35,
      phase: 'approach',
    },
    {
      position: [6.4, 2.7, 8.2],
      lookAt: [0, 0.7, 0],
      duration: 0.05,
      phase: 'shell',
      cut: true,
    },
    {
      position: [5.2, 2.5, 7.4],
      lookAt: [0, 0.55, 0],
      duration: 1.1,
      phase: 'interior',
    },
  ];
}

export function projectInteriorCam(pos: [number, number, number], slug?: string): CameraTarget {
  const sequence = projectEnterSequence(pos, slug);
  return sequence[sequence.length - 1] ?? UNIVERSE_CAM;
}

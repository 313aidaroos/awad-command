import type { CameraTarget } from '@/store/types';

export const UNIVERSE_ZOOM = 20;
export const INTERIOR_ZOOM = 11;

/** Sealed interiors live at the world origin so the camera cannot miss them. */
export const INTERIOR_ORIGIN: [number, number, number] = [0, 0, 0];

export const UNIVERSE_CAM: CameraTarget = {
  position: [0, 5.8, UNIVERSE_ZOOM],
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

/** Contraxis hall cameras — local to the sealed facility at the origin. */
export const CONTRAXIS_HALL_CAM: CameraTarget = {
  position: [-11.4, 2.15, 2.35],
  lookAt: [4.2, 1.05, 0],
  duration: 0.05,
  phase: 'interior',
  cut: true,
};

export function projectEnterSequence(
  pos: [number, number, number],
  slug?: string,
): CameraTarget[] {
  const [x, y, z] = pos;
  const [dx, , dz] = dirOf(pos);
  const hall = slug === 'contraxis';
  return [
    {
      position: [x + dx * 8.2, y + 3.6, z + dz * 8.2],
      lookAt: [x, y + 1.2, z],
      duration: 1.35,
      phase: 'approach',
    },
    hall
      ? {
          position: [-12.2, 2.25, 2.55],
          lookAt: [3.4, 1.05, 0],
          duration: 0.05,
          phase: 'shell',
          cut: true,
        }
      : {
          position: [6.4, 2.7, 8.2],
          lookAt: [0, 0.7, 0],
          duration: 0.05,
          phase: 'shell',
          cut: true,
        },
    hall
      ? CONTRAXIS_HALL_CAM
      : {
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

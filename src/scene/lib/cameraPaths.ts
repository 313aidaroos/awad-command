import type { CameraTarget } from '@/store/types';

export const UNIVERSE_ZOOM = 18;
export const INTERIOR_ZOOM = 9.2;
export const CHAMBER_RADIUS = 13.8;

export const UNIVERSE_CAM: CameraTarget = {
  position: [0, 3.15, UNIVERSE_ZOOM],
  lookAt: [0, 0.75, 0],
  duration: 1.8,
  phase: 'universe',
};

function dirOf(pos: [number, number, number]): [number, number, number] {
  const len = Math.max(0.001, Math.hypot(pos[0], pos[1], pos[2]));
  return [pos[0] / len, pos[1] / len, pos[2] / len];
}

/** Approach the monument, pause at the threshold, then sit at the nave entrance looking down the hall. */
export function projectEnterSequence(pos: [number, number, number]): CameraTarget[] {
  const [x, y, z] = pos;
  const [dx, , dz] = dirOf(pos);
  return [
    {
      position: [x + dx * 14.5, y + 4.8, z + dz * 14.5],
      lookAt: [x, y, z],
      duration: 1.55,
      phase: 'approach',
    },
    {
      position: [x + dx * 8.2, y + 2.4, z + dz * 8.2],
      lookAt: [x, y - 0.2, z],
      duration: 1.15,
      phase: 'shell',
    },
    {
      position: [x - 9.2, y + 1.45, z],
      lookAt: [x + 4.4, y - 1.25, z],
      duration: 1.45,
      phase: 'interior',
    },
  ];
}

export function projectInteriorCam(pos: [number, number, number]): CameraTarget {
  const sequence = projectEnterSequence(pos);
  return sequence[sequence.length - 1] ?? UNIVERSE_CAM;
}

export function outsideChamber(cam: [number, number, number], origin: [number, number, number]): boolean {
  const dx = cam[0] - origin[0];
  const dy = cam[1] - origin[1];
  const dz = cam[2] - origin[2];
  const radial = Math.hypot(dx, dz);
  return radial > 3.2 && dy < 6;
}

export function showExterior(enterPhase: CameraTarget['phase'] | string): boolean {
  return enterPhase === 'universe' || enterPhase === 'approach';
}

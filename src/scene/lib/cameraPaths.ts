import type { CameraTarget } from '@/store/types';

export const UNIVERSE_ZOOM = 22;
export const INTERIOR_ZOOM = 11;

export const UNIVERSE_CAM: CameraTarget = {
  position: [0, 6.4, UNIVERSE_ZOOM],
  lookAt: [0, 1.05, 0],
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

/** Approach the vessel, then land inside the hall looking down the spine. */
export function projectEnterSequence(
  pos: [number, number, number],
  slug?: string,
): CameraTarget[] {
  const [x, y, z] = pos;
  const [dx, , dz] = dirOf(pos);
  const hall = slug === 'contraxis';
  return [
    {
      position: [x + dx * 9.5, y + 4.2, z + dz * 9.5],
      lookAt: [x, y + 1.1, z],
      duration: 1.55,
      phase: 'approach',
    },
    {
      position: hall ? [x - 12.4, y + 2.35, z + 4.6] : [x + dx * 4.2, y + 2.8, z + dz * 4.2],
      lookAt: hall ? [x + 3.2, y + 0.9, z] : [x, y + 0.6, z],
      duration: 1.15,
      phase: 'shell',
    },
    {
      position: hall ? [x - 11.2, y + 2.15, z + 3.4] : [x - dx * 0.6, y + 3.4, z + 6.8],
      lookAt: hall ? [x + 4.8, y + 0.85, z] : [x, y + 0.4, z],
      duration: 1.35,
      phase: 'interior',
    },
  ];
}

export function projectInteriorCam(pos: [number, number, number], slug?: string): CameraTarget {
  const sequence = projectEnterSequence(pos, slug);
  return sequence[sequence.length - 1] ?? UNIVERSE_CAM;
}

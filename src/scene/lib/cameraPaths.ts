import type { CameraTarget } from '@/store/types';

export const UNIVERSE_CAM: CameraTarget = {
  position: [0, 8, 38],
  lookAt: [0, 0, 0],
  duration: 1.7,
  phase: 'universe',
};

function dirOf(pos: [number, number, number]): [number, number, number] {
  const len = Math.max(0.001, Math.hypot(pos[0], pos[1], pos[2]));
  return [pos[0] / len, pos[1] / len, pos[2] / len];
}

export function projectEnterSequence(pos: [number, number, number]): CameraTarget[] {
  const [x, y, z] = pos;
  const [dx, , dz] = dirOf(pos);
  return [
    {
      position: [x + dx * 16, y + 5.4, z + dz * 16],
      lookAt: [x, y, z],
      duration: 1.55,
      phase: 'approach',
    },
    {
      position: [x + dx * 5.2, y + 1.9, z + dz * 5.2],
      lookAt: [x, y, z],
      duration: 1.15,
      phase: 'shell',
    },
    {
      position: [x - dx * 0.6, y + 2.8, z - dz * 0.6],
      lookAt: [x, y - 0.15, z],
      duration: 1.35,
      phase: 'interior',
    },
  ];
}

export function projectInteriorCam(pos: [number, number, number]): CameraTarget {
  const sequence = projectEnterSequence(pos);
  return sequence[sequence.length - 1] ?? UNIVERSE_CAM;
}

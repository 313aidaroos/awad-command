import type { CameraTarget } from '@/store/types';

export const UNIVERSE_CAM: CameraTarget = {
  position: [0, 9, 42],
  lookAt: [0, 0, 0],
  duration: 1.8,
  phase: 'universe',
};

function dirOf(pos: [number, number, number]): [number, number, number] {
  const len = Math.max(0.001, Math.hypot(pos[0], pos[1], pos[2]));
  return [pos[0] / len, pos[1] / len, pos[2] / len];
}

export function projectEnterSequence(pos: [number, number, number]): CameraTarget[] {
  const [x, y, z] = pos;
  const [dx, , dz] = dirOf(pos);
  const sx = -dz;
  const sz = dx;
  return [
    {
      position: [x + dx * 22, y + 8.2, z + dz * 22],
      lookAt: [x, y, z],
      duration: 1.75,
      phase: 'approach',
    },
    {
      position: [x + dx * 2.6, y + 1.05, z + dz * 2.6],
      lookAt: [x, y, z],
      duration: 1.25,
      phase: 'shell',
    },
    {
      position: [x + sx * 8.8 - dx * 1.8, y + 8.4, z + sz * 8.8 - dz * 1.8],
      lookAt: [x, y - 0.15, z],
      duration: 1.55,
      phase: 'interior',
    },
  ];
}

export function projectInteriorCam(pos: [number, number, number]): CameraTarget {
  const sequence = projectEnterSequence(pos);
  return sequence[sequence.length - 1] ?? UNIVERSE_CAM;
}

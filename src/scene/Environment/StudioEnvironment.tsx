'use client';

import { Environment, Lightformer } from '@react-three/drei';
import { useCommandStore } from '@/store/useCommandStore';

export function StudioEnvironment() {
  const level = useCommandStore((s) => s.quality.level);
  if (level === 'low') return null;
  return (
    <Environment resolution={level === 'high' ? 192 : 96} frames={1} environmentIntensity={0.28}>
      <Lightformer intensity={2.2} position={[4, 16, 6]} scale={[8, 0.4, 1]} color="#f4f6fa" />
      <Lightformer intensity={0.9} position={[-12, 7, 4]} scale={[0.35, 8, 1]} color="#e8edf5" />
      <Lightformer intensity={0.25} position={[10, 2, -12]} scale={[8, 2, 1]} color="#3D8BFF" />
    </Environment>
  );
}

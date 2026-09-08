'use client';

import { Environment, Lightformer } from '@react-three/drei';
import { useCommandStore } from '@/store/useCommandStore';

/** Thin studio strips so graphite metal reads as a product, not a floodlit toy. */
export function StudioEnvironment() {
  const level = useCommandStore((s) => s.quality.level);
  if (level === 'low') return null;
  return (
    <Environment resolution={level === 'high' ? 256 : 128} frames={1} environmentIntensity={level === 'high' ? 0.58 : 0.42}>
      <Lightformer intensity={3.4} position={[4, 16, 6]} scale={[9, 0.45, 1]} color="#f4f6fa" />
      <Lightformer intensity={1.7} position={[-12, 7, 4]} scale={[0.4, 9, 1]} color="#e8edf5" />
      <Lightformer intensity={0.55} position={[10, 2, -12]} scale={[8, 2.4, 1]} color="#3D8BFF" />
      <Lightformer intensity={0.35} position={[0, -9, 3]} scale={[18, 3, 1]} color="#6a7380" />
    </Environment>
  );
}

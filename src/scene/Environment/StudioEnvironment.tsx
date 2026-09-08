'use client';

import { Environment, Lightformer } from '@react-three/drei';
import { useCommandStore } from '@/store/useCommandStore';

/** Always-on studio/city probe. Never depends on a CDN HDRI succeeding. */
export function StudioEnvironment() {
  const level = useCommandStore((s) => s.quality.level);
  const res = level === 'high' ? 256 : level === 'medium' ? 176 : 96;

  return (
    <Environment frames={1} resolution={res} environmentIntensity={0.92}>
      <Lightformer intensity={7.2} position={[0, 14, 2]} scale={[22, 4, 1]} color="#ffffff" />
      <Lightformer intensity={5.4} position={[6, 10, 8]} scale={[8, 10, 1]} color="#f7f9fc" />
      <Lightformer intensity={3.6} position={[-12, 6, 4]} scale={[10, 14, 1]} color="#e8edf4" />
      <Lightformer intensity={2.4} position={[10, 3, -10]} scale={[14, 6, 1]} color="#d7dde6" />
      <Lightformer intensity={1.6} position={[0, -4, 8]} scale={[20, 6, 1]} color="#c5ccd6" />
      <Lightformer intensity={0.7} position={[8, 1, -6]} scale={[6, 3, 1]} color="#3D8BFF" />
    </Environment>
  );
}

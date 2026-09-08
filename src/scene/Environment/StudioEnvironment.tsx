'use client';

import { Environment, Lightformer } from '@react-three/drei';
import { useCommandStore } from '@/store/useCommandStore';

/** One-shot studio lights so clearcoat glass has something to reflect. Off on LOW. */
export function StudioEnvironment() {
  const level = useCommandStore((s) => s.quality.level);
  if (level === 'low') return null;
  return (
    <Environment resolution={level === 'high' ? 256 : 176} frames={1} environmentIntensity={1.02}>
      <Lightformer intensity={6.4} position={[3, 13, 5]} scale={[3.2, 1.1, 1]} color="#ffffff" />
      <Lightformer intensity={4.2} position={[5, 10, 6]} scale={[14, 8, 1]} color="#f7f9fc" />
      <Lightformer intensity={2.4} position={[-8, 5, 3]} scale={[6, 10, 1]} color="#ffffff" />
      <Lightformer intensity={1.55} position={[8, 2, -8]} scale={[10, 4, 1]} color="#3D8BFF" />
      <Lightformer intensity={1} position={[0, -7, 5]} scale={[16, 4, 1]} color="#c5ccd6" />
    </Environment>
  );
}

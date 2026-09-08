'use client';

import { Environment, Lightformer } from '@react-three/drei';
import { useCommandStore } from '@/store/useCommandStore';

/** One-shot studio lights so clearcoat glass has something to reflect. Off on LOW. */
export function StudioEnvironment() {
  const level = useCommandStore((s) => s.quality.level);
  if (level === 'low') return null;
  return (
    <Environment resolution={level === 'high' ? 256 : 128} frames={1} environmentIntensity={0.62}>
      <Lightformer intensity={3.4} position={[6, 9, 5]} scale={[12, 7, 1]} color="#f3f6fb" />
      <Lightformer intensity={1.1} position={[-7, 3, -5]} scale={[8, 5, 1]} color="#3D8BFF" />
      <Lightformer intensity={0.7} position={[0, -6, 8]} scale={[14, 5, 1]} color="#b7c0cc" />
    </Environment>
  );
}

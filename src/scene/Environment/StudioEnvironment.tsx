'use client';

import { Environment, Lightformer } from '@react-three/drei';
import { useCommandStore } from '@/store/useCommandStore';
import { showExterior } from '@/scene/lib/cameraPaths';

/** Studio/city probe — Apple product-film lighting, not space-game glow. */
export function StudioEnvironment() {
  const level = useCommandStore((s) => s.quality.level);
  const interior = !showExterior(useCommandStore((s) => s.enterPhase));
  const preset = interior ? 'warehouse' : 'city';

  if (level === 'low') {
    return (
      <Environment resolution={64} frames={1} environmentIntensity={0.55}>
        <Lightformer intensity={4.2} position={[4, 12, 6]} scale={[18, 8, 1]} color="#ffffff" />
        <Lightformer intensity={2.2} position={[-10, 4, 2]} scale={[8, 12, 1]} color="#f2f4f8" />
        <Lightformer intensity={0.8} position={[8, 1, -8]} scale={[10, 4, 1]} color="#c5ccd6" />
      </Environment>
    );
  }

  return (
    <Environment
      preset={preset}
      resolution={level === 'high' ? 256 : 128}
      environmentIntensity={interior ? 0.62 : 0.48}
      background={false}
    />
  );
}

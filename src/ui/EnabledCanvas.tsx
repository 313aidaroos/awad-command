'use client';

import { CanvasHost } from '@/ui/CanvasHost';

/**
 * Loaded only via runtime import() from CommandShell after hydration when WebGL is available.
 * Pulls CanvasHost → CommandCanvas → three/R3F into a separate chunk.
 */
export function EnabledCanvas() {
  return <CanvasHost />;
}

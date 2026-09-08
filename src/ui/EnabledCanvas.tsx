'use client';

import { CanvasHost } from '@/ui/CanvasHost';

/**
 * Loaded only via runtime import() from CommandShell when canvasEnabled.
 * Pulls CanvasHost → CommandCanvas → three/R3F into a separate chunk.
 */
export function EnabledCanvas() {
  return <CanvasHost />;
}

import type { WebGLRenderer } from 'three';
import { isSafariLike } from '@/lib/safari';

export function isWebGLAvailable(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const ctx =
      canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false }) ??
      canvas.getContext('webgl', { failIfMajorPerformanceCaveat: false });
    if (!ctx) return false;
    ctx.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** Bloom/composer is never used on Safari/WebKit. */
export function supportsPostprocessing(gl?: WebGLRenderer): boolean {
  if (isSafariLike()) return false;
  try {
    if (!gl?.capabilities?.isWebGL2) return false;
    return Boolean(gl.getContext());
  } catch {
    return false;
  }
}

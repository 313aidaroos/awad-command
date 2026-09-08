import type { WebGLRenderer } from 'three';

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

/** True when the live renderer can host a WebGL2 composer (bloom/vignette). */
export function supportsPostprocessing(gl: WebGLRenderer): boolean {
  try {
    if (!gl?.capabilities?.isWebGL2) return false;
    return Boolean(gl.getContext());
  } catch {
    return false;
  }
}

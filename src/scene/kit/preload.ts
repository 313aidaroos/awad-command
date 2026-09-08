'use client';

import { useGLTF } from '@react-three/drei';
import { allKitUrls } from '@/scene/kit/catalog';

let queued = false;

/** Warm the kit once the canvas is up. Safe to call from a client effect. */
export function preloadCommandKit() {
  if (queued || typeof window === 'undefined') return;
  queued = true;
  for (const url of allKitUrls()) useGLTF.preload(url);
}

'use client';

import { useGLTF } from '@react-three/drei';
import { kitUrl, type KitName } from '@/scene/kit/catalog';

/** First-paint pieces only — skip unused Kenney hangars/rooms. */
const BOOT: KitName[] = [
  'plazaDeck',
  'floorDark',
  'computer',
  'accessPoint',
  'deskComputer',
  'deskChair',
  'lightWide',
  'shipImperial',
  'shipExecutioner',
  'shipChallenger',
  'shipInsurgent',
  'shipSpitfire',
  'shipStriker',
  'shipZenith',
  'wallAstra',
  'wallAstraOuter',
  'topCables',
  'topWindow',
  'topAstra',
  'topPlastic',
  'shortPlates',
  'doorFrame',
  'doorHeavy',
  'doorMetal',
  'windowWide',
  'cable1',
  'cable3',
  'vent',
  'barrelLarge',
  'crate',
  'chest',
  'fan',
  'decalLogo',
  'astronautA',
  'astronautB',
];

let queued = false;

/** Warm the kit once the canvas is up. Safe to call from a client effect. */
export function preloadCommandKit() {
  if (queued || typeof window === 'undefined') return;
  queued = true;
  for (const name of BOOT) useGLTF.preload(kitUrl(name));
}

import type { CameraTarget } from '@/store/types';

export type RealmKind = 'city' | 'social' | 'industrial' | 'dome' | 'music' | 'snow' | 'volcano' | 'matrix' | 'pagoda';

export interface RealmDef {
  slug: string;
  title: string;
  subtitle: string;
  kind: RealmKind;
  position: [number, number, number];
  accent: string;
}

/** Nine product realms — constellation around the palace, not a toy ship ring. */
export const REALM_ISLANDS: RealmDef[] = [
  { slug: 'apixis', title: 'APIXIS', subtitle: 'AI INFRASTRUCTURE', kind: 'city', position: [-24, 4.2, -6], accent: '#6EC8FF' },
  { slug: 'socixis', title: 'SOCIXIS', subtitle: 'CONTENT & SOCIAL', kind: 'social', position: [-20, 2.6, 14], accent: '#E48BFF' },
  { slug: 'contraxis', title: 'CONTRAXIS', subtitle: 'CONTRACTOR ECOSYSTEM', kind: 'industrial', position: [22, 1.4, 12], accent: '#C4A574' },
  { slug: 'studios', title: 'AWAD STUDIOS', subtitle: 'MEDIA & CREATIVE', kind: 'dome', position: [14, 3.6, -18], accent: '#F2E6D0' },
  { slug: 'lyrixis', title: 'LYRIXIS', subtitle: 'MUSIC & AUDIO', kind: 'music', position: [4, 2.2, -24], accent: '#A78BFA' },
  { slug: 'halaxis', title: 'HALAXIS', subtitle: 'TECH SOLUTIONS', kind: 'snow', position: [-12, 5.4, -20], accent: '#D9E8F2' },
  { slug: 'rawixis', title: 'RAWIXIS', subtitle: 'DATA & INFRASTRUCTURE', kind: 'volcano', position: [24, 0.8, -4], accent: '#FF6B3D' },
  { slug: 'awadbot', title: 'AWADBOT', subtitle: 'TRADING & FINANCE', kind: 'matrix', position: [-8, 1.2, 22], accent: '#4ADE80' },
  { slug: 'publishing', title: 'AWAD PUBLISHING', subtitle: 'BOOKS & KDP', kind: 'pagoda', position: [8, 2.8, 20], accent: '#F0C27A' },
];

export function realmOf(slug: string): RealmDef | undefined {
  return REALM_ISLANDS.find((item) => item.slug === slug);
}

export function islandCam(pos: [number, number, number]): CameraTarget {
  const [x, y, z] = pos;
  const len = Math.hypot(x, z) || 1;
  return {
    position: [x + (x / len) * 11, y + 6.2, z + (z / len) * 11],
    lookAt: [x, y + 2.1, z],
    duration: 1.05,
    phase: 'universe',
  };
}

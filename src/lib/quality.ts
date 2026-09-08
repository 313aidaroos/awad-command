import { isSafariLike } from '@/lib/safari';
import type { QualityLevel } from '@/store/types';

export function qualityFromSearch(search = typeof window === 'undefined' ? '' : window.location.search): QualityLevel | undefined {
  const raw = new URLSearchParams(search).get('quality')?.toLowerCase();
  if (raw === 'low' || raw === 'medium' || raw === 'high') return raw;
  return undefined;
}

export function detectQuality(): QualityLevel {
  const forced = qualityFromSearch();
  if (forced) return forced;
  if (typeof window === 'undefined') return 'medium';
  if (isSafariLike()) return 'medium';
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const mobile = window.matchMedia('(max-width: 768px)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const lowMemory = typeof memory === 'number' && memory <= 4;
  if (mobile && coarse) return 'low';
  if (cores <= 4 || lowMemory) return 'medium';
  if (cores <= 8) return 'medium';
  return 'high';
}

export function particleCount(level: QualityLevel, high: number, medium: number, low: number): number {
  if (level === 'high') return high;
  if (level === 'medium') return medium;
  return low;
}

export function geoSegments(level: QualityLevel, high: number, medium: number, low: number): number {
  if (level === 'high') return high;
  if (level === 'medium') return medium;
  return low;
}

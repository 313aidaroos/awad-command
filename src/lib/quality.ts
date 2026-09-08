import { isSafariLike } from '@/lib/safari';
import type { QualityLevel } from '@/store/types';

export function detectQuality(): QualityLevel {
  if (typeof window === 'undefined') return 'medium';
  if (isSafariLike()) return 'low';
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const mobile = window.matchMedia('(max-width: 768px)').matches;
  const lowMemory = typeof memory === 'number' && memory <= 4;
  if (mobile || cores <= 4 || lowMemory) return 'low';
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

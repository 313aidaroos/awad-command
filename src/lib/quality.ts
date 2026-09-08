import type { QualityLevel } from '@/store/types';

export function detectQuality(): QualityLevel {
  if (typeof window === 'undefined') return 'medium';
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const mobile = window.matchMedia('(max-width: 768px)').matches;
  if (mobile || cores <= 4 || memory <= 4) return 'low';
  if (cores <= 8) return 'medium';
  return 'high';
}

export function particleCount(level: QualityLevel, high: number, medium: number, low: number): number {
  if (level === 'high') return high;
  if (level === 'medium') return medium;
  return low;
}

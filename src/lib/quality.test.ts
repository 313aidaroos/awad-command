import { describe, expect, it } from 'vitest';
import { qualityFromSearch } from '@/lib/quality';

describe('qualityFromSearch', () => {
  it('reads ?quality=medium for MacBook-like screenshots', () => {
    expect(qualityFromSearch('?quality=medium')).toBe('medium');
    expect(qualityFromSearch('?quality=high')).toBe('high');
    expect(qualityFromSearch('?foo=1')).toBeUndefined();
  });
});

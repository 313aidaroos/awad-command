import { describe, expect, it } from 'vitest';
import { lookFromSearch } from '@/lib/lookFromSearch';
import { qualityFromSearch } from '@/lib/quality';

describe('qualityFromSearch', () => {
  it('reads ?quality=medium for MacBook-like screenshots', () => {
    expect(qualityFromSearch('?quality=medium')).toBe('medium');
    expect(qualityFromSearch('?quality=high')).toBe('high');
    expect(qualityFromSearch('?foo=1')).toBeUndefined();
  });
});

describe('lookFromSearch', () => {
  it('frames CEO close or Contraxis hall from the query string', () => {
    expect(lookFromSearch('?quality=medium&look=ceo')).toBe('ceo');
    expect(lookFromSearch('?look=contraxis')).toBe('contraxis');
    expect(lookFromSearch('?look=island')).toBe('island');
    expect(lookFromSearch('?look=sketchfab')).toBeUndefined();
  });
});

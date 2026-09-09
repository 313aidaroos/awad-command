export function lookFromSearch(
  search = typeof window === 'undefined' ? '' : window.location.search,
): 'ceo' | 'contraxis' | undefined {
  const raw = new URLSearchParams(search).get('look')?.toLowerCase();
  if (raw === 'ceo' || raw === 'contraxis') return raw;
  return undefined;
}

export function lookFromSearch(
  search = typeof window === 'undefined' ? '' : window.location.search,
): 'ceo' | 'contraxis' | 'island' | undefined {
  const raw = new URLSearchParams(search).get('look')?.toLowerCase();
  if (raw === 'ceo' || raw === 'contraxis' || raw === 'island' || raw === 'apixis') {
    return raw === 'apixis' ? 'island' : raw;
  }
  return undefined;
}

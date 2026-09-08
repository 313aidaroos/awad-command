/** True for desktop Safari and every WebKit browser (iOS Chrome/Firefox/Edge included). */
export function isSafariLike(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iP(hone|ad|od)/.test(ua) || /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)) return true;
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true;
  if (navigator.vendor === 'Apple Computer, Inc.') return true;
  return /Safari/i.test(ua) && !/Chrome|Chromium|Android|Edg|OPR|Firefox/i.test(ua);
}

/** True for desktop Safari and iOS WebKit. Safe to call during client render. */
export function isSafariLike(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iP(hone|ad|od)/.test(ua)) return true;
  return /Safari/i.test(ua) && !/Chrome|Chromium|Android|Edg|OPR|Firefox/i.test(ua);
}

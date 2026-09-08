export const CEO_OPEN_EVENT = 'awad-open-ceo';

export function requestCeoOpen() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CEO_OPEN_EVENT));
}

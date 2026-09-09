export const CEO_OPEN_EVENT = 'awad-open-ceo';
export const CEO_ASK_EVENT = 'awad-ask-ceo';

export function requestCeoOpen() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CEO_OPEN_EVENT));
}

export function requestCeoAsk(text: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CEO_ASK_EVENT, { detail: text }));
}

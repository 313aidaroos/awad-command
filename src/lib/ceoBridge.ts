// Change note (Claude, Sep 2026): requestCeoPrompt(): lets pages hand Cixy a prompt. See docs/LAUNCH_NOTES.md.
export const CEO_OPEN_EVENT = 'awad-open-ceo';

export function requestCeoOpen() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CEO_OPEN_EVENT));
}

export const CEO_PROMPT_EVENT = 'awad-ceo-prompt';

/** Open Cixy and send her this message (e.g. "Ask Cixy to draft a reply"). */
export function requestCeoPrompt(prompt: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CEO_PROMPT_EVENT, { detail: prompt }));
}

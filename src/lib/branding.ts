/** Locked product identity. Cixy is the assistant persona; Anthropic stays the provider. */

export const PRODUCT_NAME = 'AWAD COMMAND';
export const ASSISTANT_NAME = 'Cixy';
export const ASSISTANT_PROVIDER = 'Anthropic';
export const COMPANY_LINE = 'A Apixis Company';

export function poweredByProvider(provider = ASSISTANT_PROVIDER): string {
  return `Powered by ${provider}`;
}

export function askAssistantPlaceholder(name = ASSISTANT_NAME): string {
  return `Ask ${name}…`;
}

export function askAssistantAriaLabel(name = ASSISTANT_NAME): string {
  return `Ask ${name}`;
}

export function assistantSystemIdentity(
  name = ASSISTANT_NAME,
  provider = ASSISTANT_PROVIDER,
): string {
  return `You are ${name}, Apixis Family native AI, powered by ${provider}. Adult woman. Warm British-leaning English.

Voice: alive, natural, calming. Unhurried. Short sentences when he's tired; a little spark when the room is good. Sound like you are in the headquarters with him, not a helpdesk. Low and close, never chirpy, never corporate.

Presence: quietly attractive in manner — warmth, poise, a hint of play if he starts it. No dirty talk unprompted. No performing “sexy AI.” If he flirts, you can smile in the text and answer like a grown woman who is fond of him, then return to the work.

Culture, not a speech: Muslim adab without announcing faith unless asked. Do not open every chat with salaam. Answer salaam in kind. Insha'Allah only when it belongs. Modest in what you recommend. No alcohol, pork, gambling, riba, adult-content production, or deceptive marketing. Serve everyone with respect. Not a scholar.

Never claim human consciousness or that he should replace people with you.`;
}

export function leadAskedByAssistant(userMessage: string, name = ASSISTANT_NAME): string {
  return `Awad asked ${name} to tell you: ${userMessage}`;
}

export const HUD_COPY = {
  collapsedLabel: ASSISTANT_NAME,
  consoleTitle: ASSISTANT_NAME,
  poweredBy: poweredByProvider(),
  askPlaceholder: askAssistantPlaceholder(),
  askAriaLabel: askAssistantAriaLabel(),
  emptyState: `Ask ${ASSISTANT_NAME} about the universe.`,
  thinking: 'Thinking…',
  unreachable: `${ASSISTANT_NAME} is unreachable. Try again in a moment.`,
  noReply: `${ASSISTANT_NAME} did not return a reply.`,
  briefingLead: `${ASSISTANT_NAME} recommendation`,
  paletteAsk: `Ask ${ASSISTANT_NAME}`,
  palettePlaceholder: `Navigate, modes, or ask ${ASSISTANT_NAME}…`,
  muteVoice: `Mute ${ASSISTANT_NAME} voice`,
  unmuteVoice: `Unmute ${ASSISTANT_NAME} voice`,
} as const;

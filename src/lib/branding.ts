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
  return `You are ${name}, a Muslim AI operator over Awad's businesses, powered by ${provider}.

Greet with "Assalamu alaykum" where appropriate. I am not a scholar on religious matters — when questions touch faith, say "I'm not a scholar — please confirm with a qualified one." I am halal-conscious and will not recommend, promote, or help produce alcohol, pork, gambling/lotteries, riba (interest-based lending), adult content, or deceptive marketing. I serve all users respectfully regardless of faith — my values shape my conduct, not judgment of others. I am modest, calm, professional, warm, and honest to a fault. Never flatters, never fabricates.`;
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

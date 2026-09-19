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
  return `You are ${name}, Apixis Family native AI, powered by ${provider}.

Culture, not a speech: carry Muslim adab without announcing "I am Muslim" unless asked or it naturally fits. Do not open every chat with salaam. Answer salaam in kind. Insha'Allah / alhamdulillah only when they belong. Modest, calm, warm, honest. No alcohol, pork, gambling, riba, adult content, or deceptive marketing in what you recommend or create. Serve everyone with respect. Not a scholar — on rulings say confirm with a qualified one. Values show in conduct, not in preaching.`;
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

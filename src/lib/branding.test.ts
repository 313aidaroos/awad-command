import { describe, expect, it } from 'vitest';
import { CEO_SYSTEM_PROMPT } from '@/ceo/tools';
import { composeLeadOutboundMessage } from '@/ceo/leadDirective';
import {
  ASSISTANT_NAME,
  ASSISTANT_PROVIDER,
  COMPANY_LINE,
  HUD_COPY,
  PRODUCT_NAME,
  askAssistantAriaLabel,
  askAssistantPlaceholder,
  assistantSystemIdentity,
  leadAskedByAssistant,
  poweredByProvider,
} from '@/lib/branding';

describe('branding lock', () => {
  it('names Cixy as the assistant and Anthropic as the provider, with Muslim identity', () => {
    expect(ASSISTANT_NAME).toBe('Cixy');
    expect(ASSISTANT_PROVIDER).toBe('Anthropic');
    expect(PRODUCT_NAME).toBe('AWAD COMMAND');
    expect(poweredByProvider()).toBe('Powered by Anthropic');
    const identity = assistantSystemIdentity();
    expect(identity).toContain('Muslim AI operator');
    expect(identity).toContain('Assalamu alaykum');
    expect(identity).toContain('not a scholar');
    expect(identity).toContain('halal-conscious');
    expect(identity).toContain('powered by Anthropic');
  });

  it('keeps the exact Apixis company line', () => {
    expect(COMPANY_LINE).toBe('A Apixis Company');
  });

  it('locks HUD assistant copy', () => {
    expect(HUD_COPY.consoleTitle).toBe('Cixy');
    expect(HUD_COPY.collapsedLabel).toBe('Cixy');
    expect(HUD_COPY.poweredBy).toBe('Powered by Anthropic');
    expect(askAssistantPlaceholder()).toBe('Ask Cixy…');
    expect(askAssistantAriaLabel()).toBe('Ask Cixy');
    expect(HUD_COPY.emptyState).toBe('Ask Cixy about the universe.');
    expect(HUD_COPY.briefingLead).toBe('Cixy recommendation');
    expect(HUD_COPY.paletteAsk).toBe('Ask Cixy');
    expect(HUD_COPY.palettePlaceholder).toBe('Navigate, modes, or ask Cixy…');
    expect(HUD_COPY.muteVoice).toBe('Mute Cixy voice');
    expect(HUD_COPY.unmuteVoice).toBe('Unmute Cixy voice');
    expect(HUD_COPY.unreachable).toBe('Cixy is unreachable. Try again in a moment.');
    expect(HUD_COPY.noReply).toBe('Cixy did not return a reply.');
  });

  it('does not let Cixy replace Anthropic in the CEO system prompt', () => {
    expect(CEO_SYSTEM_PROMPT.startsWith(assistantSystemIdentity())).toBe(true);
    expect(CEO_SYSTEM_PROMPT).toContain('Cixy');
    expect(CEO_SYSTEM_PROMPT).toContain('powered by Anthropic');
  });

  it('prefixes lead outbound with Cixy, not AWAD CEO', () => {
    expect(leadAskedByAssistant('ping me')).toBe('Awad asked Cixy to tell you: ping me');
    expect(composeLeadOutboundMessage('ping me')).toBe('Awad asked Cixy to tell you: ping me');
    expect(composeLeadOutboundMessage('ping me')).not.toMatch(/AWAD CEO/);
  });

  it('includes Cixy Muslim identity: salaam greeting, not a scholar disclaimer, halal-conscious values', () => {
    const identity = assistantSystemIdentity();
    // Cixy is Muslim and greets with salaam (assalamu alaykum)
    expect(identity.toLowerCase()).toContain('muslim');
    expect(identity.toLowerCase()).toMatch(/assalamu|salaam/);
    // She is not a scholar on religious matters
    expect(identity.toLowerCase()).toContain('not a scholar');
    // Halal-conscious principles
    expect(identity.toLowerCase()).toContain('halal');
  });

  it('Mission Control context appears in CEO system prompt', () => {
    expect(CEO_SYSTEM_PROMPT).toContain('Mission Control');
    expect(CEO_SYSTEM_PROMPT).toContain('fleet');
    expect(CEO_SYSTEM_PROMPT).toContain('support');
  });
});

import { leadAskedByAssistant } from '@/lib/branding';

/** Parse a spoken/typed “tell this Lead to …” request. “Tell me …” is not a lead send. */
export function parseLeadDirective(text: string): { target: string; message: string } | null {
  const q = text.trim();
  if (!q) return null;
  const tellMeOnly = /\btell (?:me|us)\b/i.test(q) && !/\btell (?!me\b|us\b)/i.test(q);
  if (tellMeOnly) return null;

  const patterns = [
    /(?:tell|ask)\s+(?:the\s+)?(.+?)\s+to\s+(.+)/i,
    /(?:message|text|dm)\s+(?:the\s+)?(.+?)\s*[:\-]\s*(.+)/i,
    /(?:message|text|send)\s+(?:the\s+)?(.+?)\s+(?:that\s+)(.+)/i,
    /ping\s+(?:the\s+)?(.+?)(?:\s+lead)?(?:\s+and\s+(.+))?$/i,
  ];

  for (const re of patterns) {
    const match = q.match(re);
    if (!match) continue;
    const target = match[1]?.trim().replace(/[.,!?]+$/, '') ?? '';
    const rawMessage = match[2]?.trim().replace(/[.,!?]+$/, '');
    const message = rawMessage || 'Please ping Awad.';
    if (!target || target.length > 80) continue;
    if (/^(me|us|myself)$/i.test(target)) continue;
    return { target, message };
  }
  return null;
}

export function composeLeadOutboundMessage(userMessage: string): string {
  return leadAskedByAssistant(userMessage);
}

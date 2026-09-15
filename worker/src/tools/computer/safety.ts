export const SENSITIVE_ACTION_RE =
  /\b(purchase|buy now|checkout|pay now|payment|refund|publish|unpublish|delete|destroy|send-to-customer|send to (a )?(real )?customer)\b/i;

export const PERSONAL_LOGIN_HINT =
  "Awad's personal logins never live on this machine. Use the agents' own accounts only.";

export const PHASE1_RECORD_ONLY =
  'Phase 1 Approve is record-only. Nothing money-moving or destructive executes from the card.';

export function textLooksSensitive(text: string): boolean {
  return SENSITIVE_ACTION_RE.test(text);
}

export function urlLooksSensitive(url: string): boolean {
  return /checkout|billing|pay\b|payment|purchase|cart\/|buy\//i.test(url);
}

export function describeSensitiveHit(input: { name: string; description?: string; raw?: string }): string | null {
  const haystack = [input.name, input.description ?? '', input.raw ?? ''].join(' ');
  if (!textLooksSensitive(haystack) && !urlLooksSensitive(haystack)) return null;
  return `Paused: ${input.name} looks like purchase / publish / delete / send-to-customer. ${PHASE1_RECORD_ONLY}`;
}

export class SensitiveActionPause extends Error {
  readonly toolName: string;
  readonly screenshotUrl?: string;

  constructor(message: string, toolName: string, screenshotUrl?: string) {
    super(message);
    this.name = 'SensitiveActionPause';
    this.toolName = toolName;
    this.screenshotUrl = screenshotUrl;
  }
}

export class HaltError extends Error {
  constructor(message = 'halted') {
    super(message);
    this.name = 'HaltError';
  }
}

export class Phase1RecordOnlyError extends Error {
  constructor(toolName: string, risk: string) {
    super(`${toolName} is ${risk}. ${PHASE1_RECORD_ONLY}`);
    this.name = 'Phase1RecordOnlyError';
  }
}

/**
 * Plain-language AI failures for the owner. The most common one in production: the Anthropic account is out of
 * credits ("Your credit balance is too low to access the Anthropic API"). Every AI feature shows the same message.
 */
export const AI_CREDITS_MESSAGE =
  "Your Anthropic AI credits are used up, so the agents can't answer right now. Top up at console.anthropic.com → Plans & Billing, then try again.";

export function aiOutOfCredits(err: unknown): boolean {
  const text = err instanceof Error ? `${err.message} ${String((err as { error?: unknown }).error ?? "")}` : String(err ?? "");
  return /credit balance is too low|insufficient[_ ]credit|billing/i.test(text);
}

/** The owner-facing message for an AI failure: the credits message when that's the cause, else the fallback. */
export function friendlyAiError(err: unknown, fallback: string): string {
  return aiOutOfCredits(err) ? AI_CREDITS_MESSAGE : fallback;
}

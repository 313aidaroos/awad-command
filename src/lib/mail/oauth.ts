// Change note (Claude, Sep 2026): New. Signed OAuth state and redirect URIs. See docs/LAUNCH_NOTES.md.
import { randomBytes, timingSafeEqual } from "node:crypto";
import { googleAuthUrl, googleConfigured, googleExchangeCode } from "@/lib/mail/google";
import { microsoftAuthUrl, microsoftConfigured, microsoftExchangeCode } from "@/lib/mail/microsoft";
import type { MailProvider } from "@/lib/mail/types";

export const STATE_COOKIE = "awad_mail_oauth";

export function isMailProvider(value: string): value is MailProvider {
  return value === "google" || value === "microsoft";
}

export function providerConfigured(provider: MailProvider, env: Record<string, string | undefined> = process.env) {
  return provider === "google" ? googleConfigured(env) : microsoftConfigured(env);
}

/** Must match the redirect URI registered with Google / Microsoft exactly. */
export function mailRedirectUri(provider: MailProvider, requestUrl: string, env: Record<string, string | undefined> = process.env) {
  const site = env.NEXT_PUBLIC_SITE_URL?.trim();
  let origin = new URL(requestUrl).origin;
  if (site) {
    try {
      origin = new URL(site).origin;
    } catch {
      /* keep request origin */
    }
  }
  return `${origin}/api/mail/callback/${provider}`;
}

export function newState(provider: MailProvider) {
  return `${provider}.${randomBytes(24).toString("base64url")}`;
}

export function stateMatches(cookieValue: string | undefined, returned: string | null) {
  if (!cookieValue || !returned) return false;
  const a = Buffer.from(cookieValue);
  const b = Buffer.from(returned);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function authUrl(provider: MailProvider, redirectUri: string, state: string) {
  return provider === "google" ? googleAuthUrl(redirectUri, state) : microsoftAuthUrl(redirectUri, state);
}

export function exchangeCode(provider: MailProvider, code: string, redirectUri: string) {
  return provider === "google" ? googleExchangeCode(code, redirectUri) : microsoftExchangeCode(code, redirectUri);
}

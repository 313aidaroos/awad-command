// Change note (Claude, Sep 2026): New. Starts Gmail/Outlook OAuth with a signed state. See docs/LAUNCH_NOTES.md.
import { NextResponse } from "next/server";
import { isLeadOwner } from "@/lib/leadOwner";
import { hasMailTokenKey } from "@/lib/mail/crypto";
import {
  STATE_COOKIE,
  authUrl,
  isMailProvider,
  mailRedirectUri,
  newState,
  providerConfigured,
} from "@/lib/mail/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Owner clicks "Connect Gmail / Outlook" → provider consent screen. */
export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const back = (reason: string) =>
    NextResponse.redirect(new URL(`/email?mail_error=${encodeURIComponent(reason)}`, request.url));
  if (!(await isLeadOwner())) return NextResponse.json({ error: "Owner sign-in required." }, { status: 401 });
  if (!isMailProvider(provider)) return back("Unknown mail provider.");
  if (!providerConfigured(provider))
    return back(provider === "google" ? "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set." : "MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET are not set.");
  if (!hasMailTokenKey()) return back("MAIL_TOKEN_KEY is not set (32+ random characters).");
  const state = newState(provider);
  const response = NextResponse.redirect(authUrl(provider, mailRedirectUri(provider, request.url), state));
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/api/mail/callback",
    maxAge: 600,
  });
  return response;
}

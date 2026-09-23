import { NextResponse, type NextRequest } from "next/server";
import { isLeadOwner } from "@/lib/leadOwner";
import { saveMailAccount } from "@/lib/mail/accounts";
import { STATE_COOKIE, exchangeCode, isMailProvider, mailRedirectUri, stateMatches } from "@/lib/mail/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Provider → COMMAND. Verifies state, stores the encrypted refresh token, back to the Mailroom. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const url = new URL(request.url);
  const done = (query: string) => {
    const res = NextResponse.redirect(new URL(`/email?${query}`, request.url));
    res.cookies.set(STATE_COOKIE, "", { path: "/api/mail/callback", maxAge: 0 });
    return res;
  };
  if (!(await isLeadOwner())) return NextResponse.json({ error: "Owner sign-in required." }, { status: 401 });
  if (!isMailProvider(provider)) return done("mail_error=Unknown%20provider");
  const state = url.searchParams.get("state");
  if (!stateMatches(request.cookies.get(STATE_COOKIE)?.value, state) || !state?.startsWith(`${provider}.`))
    return done("mail_error=Sign-in%20expired.%20Try%20Connect%20again.");
  const denied = url.searchParams.get("error");
  if (denied) return done(`mail_error=${encodeURIComponent(`Provider said: ${denied}`)}`);
  const code = url.searchParams.get("code");
  if (!code) return done("mail_error=No%20authorization%20code");
  try {
    const account = await exchangeCode(provider, code, mailRedirectUri(provider, request.url));
    await saveMailAccount({ provider, ...account });
    return done(`mail_connected=${encodeURIComponent(account.email)}`);
  } catch (error) {
    return done(`mail_error=${encodeURIComponent(error instanceof Error ? error.message : "Connection failed.")}`);
  }
}

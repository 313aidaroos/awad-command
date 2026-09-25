// Change note (Claude, Sep 2026): New. Lists and disconnects your connected mailboxes (owner only). See docs/LAUNCH_NOTES.md.
import { NextResponse } from "next/server";
import { isLeadOwner } from "@/lib/leadOwner";
import { disconnectMailAccount, listMailAccounts } from "@/lib/mail/accounts";
import { hasMailTokenKey } from "@/lib/mail/crypto";
import { googleConfigured } from "@/lib/mail/google";
import { microsoftConfigured } from "@/lib/mail/microsoft";
import { sameOrigin } from "@/lib/mail/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function GET() {
  if (!(await isLeadOwner())) return NextResponse.json({ error: "Owner sign-in required." }, { status: 401, headers });
  const setup = { google: googleConfigured(), microsoft: microsoftConfigured(), tokenKey: hasMailTokenKey() };
  try {
    return NextResponse.json({ accounts: await listMailAccounts(), setup }, { headers });
  } catch (e) {
    return NextResponse.json({ accounts: [], setup, error: e instanceof Error ? e.message : "Mailboxes unavailable." }, { headers });
  }
}

export async function DELETE(request: Request) {
  if (!(await isLeadOwner())) return NextResponse.json({ error: "Owner sign-in required." }, { status: 401, headers });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403, headers });
  try {
    const id = new URL(request.url).searchParams.get("id") ?? "";
    return NextResponse.json(await disconnectMailAccount(id), { headers });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not disconnect." }, { status: 400, headers });
  }
}

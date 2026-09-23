import { NextResponse } from "next/server";
import { isLeadOwner } from "@/lib/leadOwner";
import { createNewDraft, createReplyDraft } from "@/lib/mail/accounts";
import { errorMessage, sameOrigin } from "@/lib/mail/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

/** Save a draft in the real mailbox. { accountId, messageId, body } = reply; { accountId, to, subject, body } = new. Never sends. */
export async function POST(request: Request) {
  if (!(await isLeadOwner())) return NextResponse.json({ error: "Owner sign-in required." }, { status: 401, headers });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403, headers });
  try {
    const input = (await request.json()) as Record<string, unknown>;
    const draft = input.messageId ? await createReplyDraft(input) : await createNewDraft(input);
    return NextResponse.json(draft, { headers });
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e, "Draft not saved.") }, { status: 400, headers });
  }
}

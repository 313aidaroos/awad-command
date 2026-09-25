// Change note (Claude, Sep 2026): New. Sends a draft only on your tap (owner only). Cixy has no send tool. See docs/LAUNCH_NOTES.md.
import { NextResponse } from "next/server";
import { z } from "zod";
import { isLeadOwner } from "@/lib/leadOwner";
import { sendMailDraft } from "@/lib/mail/accounts";
import { errorMessage, sameOrigin } from "@/lib/mail/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const Body = z.object({ accountId: z.string().uuid(), draftId: z.string().min(1).max(512) });

/** The owner's Send tap. Cixy has no tool that reaches this route. */
export async function POST(request: Request) {
  if (!(await isLeadOwner())) return NextResponse.json({ error: "Owner sign-in required." }, { status: 401, headers });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403, headers });
  try {
    const { accountId, draftId } = Body.parse(await request.json());
    return NextResponse.json(await sendMailDraft(accountId, draftId), { headers });
  } catch (e) {
    return NextResponse.json(
      { error: `${errorMessage(e, "Send failed.")} Check the draft in your mailbox before trying again.` },
      { status: 400, headers },
    );
  }
}

import { NextResponse } from "next/server";
import { isLeadOwner } from "@/lib/leadOwner";
import { listUnifiedInbox, readMailMessage } from "@/lib/mail/accounts";
import { errorMessage } from "@/lib/mail/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

/** GET ?account=&q=&unread=1&limit=  → unified list · GET ?account=<id>&message=<id> → one message. */
export async function GET(request: Request) {
  if (!(await isLeadOwner())) return NextResponse.json({ error: "Owner sign-in required." }, { status: 401, headers });
  const q = new URL(request.url).searchParams;
  try {
    const account = q.get("account") || undefined;
    const message = q.get("message");
    if (account && message) return NextResponse.json(await readMailMessage(account, message), { headers });
    return NextResponse.json(
      await listUnifiedInbox({
        accountId: account,
        query: q.get("q") || undefined,
        unreadOnly: q.get("unread") === "1",
        limit: Number(q.get("limit") ?? 40) || 40,
      }),
      { headers },
    );
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e, "Inbox unavailable.") }, { status: 503, headers });
  }
}

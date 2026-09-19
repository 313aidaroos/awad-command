import { NextResponse } from "next/server";
import { isLeadOwner } from "@/lib/leadOwner";
import {
  createEmailDraft,
  listEmailDrafts,
  listReceivedEmails,
  readReceivedEmail,
  sendEmailDraft,
} from "@/lib/cixyEmail";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export async function GET(request: Request) {
  if (!(await isLeadOwner()))
    return NextResponse.json(
      { error: "Sign in as owner to open the Mailroom." },
      { status: 401, headers },
    );
  try {
    const q = new URL(request.url).searchParams;
    if (q.has("message"))
      return NextResponse.json(await readReceivedEmail(q.get("message")!), {
        headers,
      });
    if (q.get("view") === "received")
      return NextResponse.json(await listReceivedEmails(), { headers });
    return NextResponse.json(
      {
        drafts: await listEmailDrafts(),
        sendingConfigured: !!process.env.RESEND_API_KEY,
      },
      { headers },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Email unavailable." },
      { status: 503, headers },
    );
  }
}
export async function POST(request: Request) {
  if (!(await isLeadOwner()))
    return NextResponse.json(
      { error: "Sign in as owner to use email." },
      { status: 401, headers },
    );
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return NextResponse.json(
      { error: "Invalid origin." },
      { status: 403, headers },
    );
  try {
    const input = await request.json();
    if (input.action === "send" && typeof input.draftId === "string")
      return NextResponse.json(await sendEmailDraft(input.draftId), {
        headers,
      });
    if (input.action !== "draft")
      return NextResponse.json(
        { error: "Unknown mail action." },
        { status: 400, headers },
      );
    return NextResponse.json(await createEmailDraft(input), { headers });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error && e.name !== "ZodError"
            ? e.message
            : "Check recipient, subject, and message.",
      },
      { status: 400, headers },
    );
  }
}

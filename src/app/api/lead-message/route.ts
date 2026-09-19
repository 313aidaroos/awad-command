import { isLeadOwner } from "@/lib/leadOwner";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  leadMessageApiBody,
  leadMessageHttpStatus,
  sendLeadMessage,
} from "@/lib/leadOutbound";

const BodySchema = z.object({
  projectSlug: z.string().min(1),
  message: z.string().min(1).max(4000),
});

export async function POST(request: Request) {
  if (!(await isLeadOwner()))
    return NextResponse.json(
      { error: "Sign in to message a lead." },
      { status: 401 },
    );
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const result = await sendLeadMessage(parsed.data);
  return NextResponse.json(leadMessageApiBody(result), {
    status: leadMessageHttpStatus(result),
  });
}

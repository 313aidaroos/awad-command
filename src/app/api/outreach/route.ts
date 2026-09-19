import { NextResponse } from "next/server";
import { z } from "zod";
import { createEmailDraft } from "@/lib/cixyEmail";
import { OUTREACH_LIMIT } from "@/projects/outreach";
import { letterFor } from "@/projects/outreachLetters";
import { getProject } from "@/projects/registry";

const Row = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  house: z.string().trim().min(1).max(120),
  why: z.string().trim().min(1).max(240),
});

const Body = z.object({
  projectSlug: z.string().trim().min(1),
  rows: z.array(Row).min(1).max(OUTREACH_LIMIT),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Need projectSlug and 1–50 rows." }, { status: 400 });
  if (!getProject(parsed.data.projectSlug))
    return NextResponse.json({ error: "Unknown company." }, { status: 404 });

  const drafts: { to: string; draftId?: string; error?: string }[] = [];
  for (const row of parsed.data.rows) {
    const letter = letterFor(parsed.data.projectSlug, row);
    try {
      const saved = await createEmailDraft({
        to: letter.to,
        subject: letter.subject,
        body: letter.body,
        business: parsed.data.projectSlug,
      });
      drafts.push({ to: letter.to, draftId: saved.draftId });
    } catch (error) {
      drafts.push({
        to: letter.to,
        error: error instanceof Error ? error.message : "draft failed",
      });
    }
  }
  return NextResponse.json({
    queued: drafts.filter((d) => d.draftId).length,
    failed: drafts.filter((d) => d.error).length,
    drafts,
    next: "Open /email. Approve each draft. One send. No second pass.",
  });
}

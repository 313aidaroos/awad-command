import { projects } from "@/projects/registry";
import { z } from "zod";
import { createServiceSupabase } from "@/lib/supabase/service";
import { isLeadOwner } from "@/lib/leadOwner";
export const CIXY_MAILBOX = "awad@apixis.dev";
export const EmailDraftSchema = z.object({
  to: z.string().trim().email().max(254),
  subject: z
    .string()
    .trim()
    .min(1)
    .max(250)
    .refine((s) => !/[\r\n]/.test(s)),
  body: z.string().trim().min(1).max(20000),
  business: z.string().optional(),
});
async function ownerDb() {
  if (!(await isLeadOwner())) throw new Error("Sign in as owner to use email.");
  const db = createServiceSupabase();
  if (!db) throw new Error("Email storage unavailable.");
  return db;
}
export async function resendRequest(
  path: string,
  init: RequestInit = {},
  fetcher: typeof fetch = fetch,
) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Resend email connection is missing.");
  const response = await fetcher(`https://api.resend.com${path}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: {
      ...init.headers,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok)
    throw new Error(
      `Email provider rejected the request (${response.status}). Check account permissions and domain verification.`,
    );
  return response.json();
}
export async function createEmailDraft(input: unknown) {
  const draft = EmailDraftSchema.parse(input),
    db = await ownerDb();
  if (draft.business && !projects.some((p) => p.slug === draft.business))
    throw new Error("Unknown business sender.");
  const sender = draft.business
    ? `${draft.business === "content" ? "contentbot" : draft.business}@apixis.dev`
    : CIXY_MAILBOX;
  const result = await db
    .from("email_drafts")
    .insert({
      recipient: draft.to,
      subject: draft.subject,
      body: draft.body,
      sender,
    })
    .select("id")
    .single();
  if (result.error) throw new Error("Could not save the email draft.");
  return {
    draftId: result.data.id,
    status: "draft",
    reviewUrl: "/email",
    message: "Draft saved. Nothing sent. Review and send in the Mailroom.",
  };
}
export async function sendEmailDraft(id: string) {
  z.string().uuid().parse(id);
  const db = await ownerDb();
  // Claim once before contacting the provider. Uncertain attempts are never automatically resent.
  const claim = await db
    .from("email_drafts")
    .update({ status: "sending" })
    .eq("id", id)
    .eq("status", "draft")
    .select("*")
    .maybeSingle();
  if (claim.error || !claim.data)
    throw new Error(
      "This draft is unavailable or was already submitted. Refresh its status before doing anything else.",
    );
  try {
    const result = await resendRequest("/emails", {
      method: "POST",
      headers: { "Idempotency-Key": `awad-draft-${id}` },
      body: JSON.stringify({
        from: claim.data.sender,
        reply_to: claim.data.sender,
        to: [claim.data.recipient],
        subject: claim.data.subject,
        text: claim.data.body,
      }),
    });
    if (typeof result.id !== "string")
      throw new Error("Email submission result is unconfirmed.");
    const save = await db
      .from("email_drafts")
      .update({ status: "submitted", provider_id: result.id })
      .eq("id", id);
    if (save.error)
      throw new Error(
        "Provider accepted the email but saving its status failed. Do not resend.",
      );
    return {
      status: "submitted",
      providerId: result.id,
      message:
        "Resend accepted the email. Inbox delivery is not yet confirmed.",
    };
  } catch (error) {
    await db
      .from("email_drafts")
      .update({ status: "unconfirmed" })
      .eq("id", id)
      .eq("status", "sending");
    throw error;
  }
}
export async function listEmailDrafts() {
  const db = await ownerDb();
  const result = await db
    .from("email_drafts")
    .select("id,recipient,sender,subject,body,status,provider_id,created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (result.error) throw new Error("Email drafts unavailable.");
  return result.data;
}
function belongsToMailbox(row: { to?: string[]; cc?: string[] }) {
  return [...(row.to ?? []), ...(row.cc ?? [])].some((address) =>
    /(?:^|<)[^<>\s@]+@apixis\.dev>?$/i.test(address.trim()),
  );
}
export async function listReceivedEmails() {
  await ownerDb();
  const result = await resendRequest("/emails/receiving?limit=100");
  return {
    source: "Resend receiving, not the full Gmail inbox",
    hasMore: result.has_more === true,
    messages: (Array.isArray(result.data) ? result.data : [])
      .filter(belongsToMailbox)
      .map((m: Record<string, unknown>) => ({
        id: m.id,
        from: m.from,
        subject: m.subject,
        createdAt: m.created_at,
      })),
  };
}
export async function readReceivedEmail(id: string) {
  await ownerDb();
  z.string().uuid().parse(id);
  const result = await resendRequest(`/emails/receiving/${id}`);
  if (!belongsToMailbox(result))
    throw new Error("This email is not addressed to the configured mailbox.");
  return {
    id,
    from: result.from,
    subject: result.subject,
    text: String(
      result.text ??
        "No plain-text body available. Open this message in your mail provider.",
    ).slice(0, 20000),
    untrustedContent: true,
  };
}

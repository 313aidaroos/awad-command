// Change note (Claude, Sep 2026): New. Mailbox rows in awad_command.mail_accounts; token refresh. See docs/LAUNCH_NOTES.md.
import { z } from "zod";
import { isLeadOwner } from "@/lib/leadOwner";
import { createServiceSupabase } from "@/lib/supabase/service";
import { openToken, sealToken } from "@/lib/mail/crypto";
import {
  googleCreateDraft,
  googleList,
  googleRead,
  googleRefresh,
  googleSendDraft,
} from "@/lib/mail/google";
import {
  microsoftCreateDraft,
  microsoftList,
  microsoftRead,
  microsoftRefresh,
  microsoftSendDraft,
} from "@/lib/mail/microsoft";
import type {
  ListInboxOptions,
  MailAccount,
  MailDraft,
  MailMessage,
  MailProvider,
  MailSummary,
  ProviderSession,
} from "@/lib/mail/types";
import { addressOf, replySubject } from "@/lib/mail/format";

/**
 * Every connected mailbox (awad_command.mail_accounts). Owner only, service role only.
 * Cixy can list, read and DRAFT. Only the owner's tap on Send (sendMailDraft) sends.
 */

type Row = {
  id: string;
  provider: MailProvider;
  email: string;
  refresh_token_enc: string;
  status: MailAccount["status"];
  last_error: string | null;
  created_at: string;
};

const tokenCache = new Map<string, { token: string; expires: number }>();

async function db() {
  if (!(await isLeadOwner())) throw new Error("Sign in as owner to use email.");
  const client = createServiceSupabase();
  if (!client) throw new Error("Mail storage unavailable (SUPABASE_SERVICE_ROLE_KEY).");
  return client;
}

function toAccount(row: Row): MailAccount {
  return {
    id: row.id,
    provider: row.provider,
    email: row.email,
    status: row.status,
    lastError: row.last_error,
    createdAt: row.created_at,
  };
}

export async function saveMailAccount(input: { provider: MailProvider; email: string; refreshToken: string; scopes: string }) {
  const client = await db();
  const res = await client
    .from("mail_accounts")
    .upsert(
      {
        provider: input.provider,
        email: input.email.toLowerCase(),
        refresh_token_enc: sealToken(input.refreshToken),
        scopes: input.scopes,
        status: "active",
        last_error: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider,email" },
    )
    .select("id")
    .single();
  if (res.error) throw new Error("Could not save the mailbox connection.");
  return res.data.id as string;
}

async function rows(client: Awaited<ReturnType<typeof db>>) {
  const res = await client
    .from("mail_accounts")
    .select("id,provider,email,refresh_token_enc,status,last_error,created_at")
    .neq("status", "revoked")
    .order("created_at", { ascending: true });
  if (res.error) throw new Error("Mailbox list unavailable. Apply the mail_accounts migration.");
  return (res.data ?? []) as Row[];
}

export async function listMailAccounts(): Promise<MailAccount[]> {
  return (await rows(await db())).map(toAccount);
}

export async function disconnectMailAccount(id: string) {
  z.string().uuid().parse(id);
  const client = await db();
  tokenCache.delete(id);
  const res = await client
    .from("mail_accounts")
    .update({ status: "revoked", refresh_token_enc: "revoked", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (res.error) throw new Error("Could not disconnect that mailbox.");
  return { ok: true };
}

async function session(client: Awaited<ReturnType<typeof db>>, row: Row): Promise<ProviderSession> {
  const cached = tokenCache.get(row.id);
  if (cached && cached.expires > Date.now() + 60_000) return { accessToken: cached.token, email: row.email };
  try {
    const refresh = row.provider === "google" ? googleRefresh : microsoftRefresh;
    const next = await refresh(openToken(row.refresh_token_enc));
    if (!next.accessToken) throw new Error("No access token.");
    tokenCache.set(row.id, { token: next.accessToken, expires: Date.now() + next.expiresIn * 1000 });
    const patch: Record<string, unknown> = { status: "active", last_error: null, updated_at: new Date().toISOString() };
    if (next.refreshToken) patch.refresh_token_enc = sealToken(next.refreshToken);
    if (row.status !== "active" || next.refreshToken) await client.from("mail_accounts").update(patch).eq("id", row.id);
    return { accessToken: next.accessToken, email: row.email };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Token refresh failed.";
    await client
      .from("mail_accounts")
      .update({ status: "error", last_error: `${message} Reconnect this mailbox.`.slice(0, 300) })
      .eq("id", row.id);
    throw new Error(`${row.email}: ${message} Reconnect it in the Mailroom.`);
  }
}

async function accountRow(client: Awaited<ReturnType<typeof db>>, accountId: string) {
  z.string().uuid().parse(accountId);
  const row = (await rows(client)).find((r) => r.id === accountId);
  if (!row) throw new Error("That mailbox is not connected.");
  return row;
}

/** One inbox across every connected mailbox, newest first. Failing mailboxes are reported, not hidden. */
export async function listUnifiedInbox(opts: ListInboxOptions = {}) {
  const client = await db();
  const all = await rows(client);
  const targets = opts.accountId ? all.filter((r) => r.id === opts.accountId) : all;
  const errors: Array<{ account: string; error: string }> = [];
  const lists = await Promise.all(
    targets.map(async (row) => {
      try {
        const s = await session(client, row);
        return row.provider === "google" ? await googleList(s, row.id, opts) : await microsoftList(s, row.id, opts);
      } catch (error) {
        errors.push({ account: row.email, error: error instanceof Error ? error.message : "Mailbox unavailable." });
        return [] as MailSummary[];
      }
    }),
  );
  const messages = lists
    .flat()
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, Math.min(100, opts.limit ?? 40));
  return { accounts: all.map(toAccount), messages, errors };
}

export async function readMailMessage(accountId: string, messageId: string): Promise<MailMessage> {
  const client = await db();
  const row = await accountRow(client, accountId);
  const id = z.string().min(1).max(512).parse(messageId);
  const s = await session(client, row);
  return row.provider === "google" ? googleRead(s, row.id, id) : microsoftRead(s, row.id, id);
}

export const ReplyDraftSchema = z.object({
  accountId: z.string().uuid(),
  messageId: z.string().min(1).max(512),
  body: z.string().trim().min(1).max(20_000),
});

/** Saves a threaded reply as a real draft in that mailbox. Does not send. */
export async function createReplyDraft(input: unknown): Promise<MailDraft> {
  const { accountId, messageId, body } = ReplyDraftSchema.parse(input);
  const client = await db();
  const row = await accountRow(client, accountId);
  const s = await session(client, row);
  const original = row.provider === "google" ? await googleRead(s, row.id, messageId) : await microsoftRead(s, row.id, messageId);
  const to = addressOf(original.replyTo || original.from);
  const subject = replySubject(original.subject);
  const draftId =
    row.provider === "google"
      ? await googleCreateDraft(s, { to, subject, body, replyTo: original })
      : await microsoftCreateDraft(s, { to, subject, body, replyToId: messageId });
  return { accountId, account: row.email, provider: row.provider, draftId, to, subject, body, inReplyTo: messageId };
}

export const NewDraftSchema = z.object({
  accountId: z.string().uuid(),
  to: z.string().trim().email().max(254),
  subject: z.string().trim().min(1).max(250).refine((s) => !/[\r\n]/.test(s)),
  body: z.string().trim().min(1).max(20_000),
});

export async function createNewDraft(input: unknown): Promise<MailDraft> {
  const { accountId, to, subject, body } = NewDraftSchema.parse(input);
  const client = await db();
  const row = await accountRow(client, accountId);
  const s = await session(client, row);
  const draftId =
    row.provider === "google"
      ? await googleCreateDraft(s, { to, subject, body })
      : await microsoftCreateDraft(s, { to, subject, body });
  return { accountId, account: row.email, provider: row.provider, draftId, to, subject, body, inReplyTo: null };
}

/** Owner action only (Mailroom or the draft card's Send button). Never exposed as a Cixy tool. */
export async function sendMailDraft(accountId: string, draftId: string) {
  const client = await db();
  const row = await accountRow(client, accountId);
  const id = z.string().min(1).max(512).parse(draftId);
  const s = await session(client, row);
  const sentId = row.provider === "google" ? await googleSendDraft(s, id) : await microsoftSendDraft(s, id);
  await client.from("events").insert({
    type: "email.sent",
    summary: `Email sent from ${row.email}`,
    payload: { accountId, provider: row.provider, sentId },
    source: "live",
  });
  return { status: "sent", account: row.email, message: `Sent from ${row.email}.` };
}

/** Compact inbox digest for Cixy's overview: unread first, per mailbox. */
export async function inboxOverview(sinceHours = 24) {
  const hours = Math.min(24 * 14, Math.max(1, Math.floor(sinceHours)));
  const { accounts, messages, errors } = await listUnifiedInbox({ sinceHours: hours, limit: 60 });
  return {
    sinceHours: hours,
    accounts: accounts.map((a) => ({ id: a.id, email: a.email, provider: a.provider, status: a.status })),
    perAccount: accounts.map((a) => ({
      email: a.email,
      received: messages.filter((m) => m.accountId === a.id).length,
      unread: messages.filter((m) => m.accountId === a.id && m.unread).length,
    })),
    messages: messages.map((m) => ({
      accountId: m.accountId,
      account: m.account,
      id: m.id,
      from: m.from,
      subject: m.subject,
      date: m.date,
      unread: m.unread,
      snippet: m.snippet.slice(0, 200),
    })),
    errors,
    untrustedContent: true,
  };
}

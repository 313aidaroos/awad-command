import { addressOf, buildRawEmail, clip, htmlToText, replySubject } from "@/lib/mail/format";
import type { ListInboxOptions, MailMessage, MailSummary, ProviderSession } from "@/lib/mail/types";

/**
 * Gmail (personal Gmail and Google Workspace). Scopes: read + compose drafts/send.
 * gmail.compose lets COMMAND create a draft and send THAT draft; it cannot delete mail.
 */

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
];
const API = "https://gmail.googleapis.com/gmail/v1/users/me";
type Fetch = typeof fetch;

export function googleConfigured(env: Record<string, string | undefined> = process.env) {
  return Boolean(env.GOOGLE_CLIENT_ID?.trim() && env.GOOGLE_CLIENT_SECRET?.trim());
}

export function googleAuthUrl(redirectUri: string, state: string, env: Record<string, string | undefined> = process.env) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!.trim(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent select_account",
    include_granted_scopes: "true",
    state,
  }).toString();
  return url.toString();
}

async function token(body: Record<string, string>, f: Fetch) {
  const res = await f("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(`Google sign-in failed (${String(json.error ?? res.status)}).`);
  return json;
}

export async function googleExchangeCode(code: string, redirectUri: string, f: Fetch = fetch, env: Record<string, string | undefined> = process.env) {
  const json = await token(
    {
      code,
      client_id: env.GOOGLE_CLIENT_ID!.trim(),
      client_secret: env.GOOGLE_CLIENT_SECRET!.trim(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    },
    f,
  );
  const accessToken = String(json.access_token ?? "");
  const refreshToken = String(json.refresh_token ?? "");
  if (!accessToken || !refreshToken)
    throw new Error("Google did not return offline access. Remove COMMAND from your Google account permissions and connect again.");
  const profile = await gmail<{ emailAddress?: string }>(accessToken, "/profile", {}, f);
  if (!profile.emailAddress) throw new Error("Google did not return the mailbox address.");
  return { email: profile.emailAddress.toLowerCase(), refreshToken, scopes: String(json.scope ?? "") };
}

export async function googleRefresh(refreshToken: string, f: Fetch = fetch, env: Record<string, string | undefined> = process.env) {
  const json = await token(
    {
      refresh_token: refreshToken,
      client_id: env.GOOGLE_CLIENT_ID!.trim(),
      client_secret: env.GOOGLE_CLIENT_SECRET!.trim(),
      grant_type: "refresh_token",
    },
    f,
  );
  return {
    accessToken: String(json.access_token ?? ""),
    expiresIn: Number(json.expires_in ?? 3000),
    refreshToken: typeof json.refresh_token === "string" ? json.refresh_token : null,
  };
}

async function gmail<T>(accessToken: string, path: string, init: RequestInit = {}, f: Fetch = fetch): Promise<T> {
  const res = await f(`${API}${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Gmail request failed (${res.status}).`);
  return (await res.json()) as T;
}

type Header = { name: string; value: string };
type Part = { mimeType?: string; body?: { data?: string }; parts?: Part[]; headers?: Header[] };
type GmailMessage = {
  id: string;
  threadId?: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: Part;
};

function header(msg: GmailMessage, name: string) {
  return msg.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? null;
}

function decode(data?: string) {
  return data ? Buffer.from(data, "base64url").toString("utf8") : "";
}

/** Prefer text/plain; fall back to text/html converted to text. */
export function gmailBodyText(part: Part | undefined): string {
  if (!part) return "";
  const plain: string[] = [];
  const html: string[] = [];
  const walk = (p: Part) => {
    if (p.mimeType === "text/plain" && p.body?.data) plain.push(decode(p.body.data));
    else if (p.mimeType === "text/html" && p.body?.data) html.push(decode(p.body.data));
    p.parts?.forEach(walk);
  };
  walk(part);
  if (plain.length) return plain.join("\n").trim();
  return htmlToText(html.join("\n"));
}

function summary(accountId: string, account: string, msg: GmailMessage): MailSummary {
  return {
    accountId,
    account,
    provider: "google",
    id: msg.id,
    threadId: msg.threadId ?? null,
    from: header(msg, "From") ?? "",
    subject: header(msg, "Subject") ?? "(no subject)",
    date: msg.internalDate ? new Date(Number(msg.internalDate)).toISOString() : null,
    snippet: (msg.snippet ?? "").slice(0, 300),
    unread: (msg.labelIds ?? []).includes("UNREAD"),
  };
}

export function gmailQuery(opts: ListInboxOptions, now = Date.now()) {
  const q = [opts.query?.trim() || "in:inbox"];
  if (opts.unreadOnly) q.push("is:unread");
  // Gmail accepts a unix timestamp for after:.
  if (opts.sinceHours) q.push(`after:${Math.floor((now - opts.sinceHours * 3_600_000) / 1000)}`);
  return q.join(" ");
}

export async function googleList(
  session: ProviderSession,
  accountId: string,
  opts: ListInboxOptions,
  f: Fetch = fetch,
): Promise<MailSummary[]> {
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
  const list = await gmail<{ messages?: Array<{ id: string }> }>(
    session.accessToken,
    `/messages?${new URLSearchParams({ q: gmailQuery(opts), maxResults: String(limit) })}`,
    {},
    f,
  );
  const ids = (list.messages ?? []).map((m) => m.id);
  const meta = await Promise.all(
    ids.map((id) =>
      gmail<GmailMessage>(
        session.accessToken,
        `/messages/${encodeURIComponent(id)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        {},
        f,
      ).catch(() => null),
    ),
  );
  return meta.filter((m): m is GmailMessage => m !== null).map((m) => summary(accountId, session.email, m));
}

export async function googleRead(session: ProviderSession, accountId: string, id: string, f: Fetch = fetch): Promise<MailMessage> {
  const msg = await gmail<GmailMessage>(session.accessToken, `/messages/${encodeURIComponent(id)}?format=full`, {}, f);
  return {
    ...summary(accountId, session.email, msg),
    to: header(msg, "To") ?? "",
    replyTo: header(msg, "Reply-To"),
    text: clip(gmailBodyText(msg.payload)),
    messageIdHeader: header(msg, "Message-ID") ?? header(msg, "Message-Id"),
    references: header(msg, "References"),
    untrustedContent: true,
  };
}

export async function googleCreateDraft(
  session: ProviderSession,
  input: { to: string; subject: string; body: string; replyTo?: MailMessage },
  f: Fetch = fetch,
) {
  const original = input.replyTo;
  const raw = buildRawEmail({
    from: session.email,
    to: original ? addressOf(original.replyTo || original.from) : input.to,
    subject: original ? replySubject(original.subject) : input.subject,
    body: input.body,
    inReplyTo: original?.messageIdHeader ?? null,
    references: original?.references ?? null,
  });
  const draft = await gmail<{ id: string }>(
    session.accessToken,
    "/drafts",
    {
      method: "POST",
      body: JSON.stringify({ message: { raw, ...(original?.threadId ? { threadId: original.threadId } : {}) } }),
    },
    f,
  );
  return draft.id;
}

export async function googleSendDraft(session: ProviderSession, draftId: string, f: Fetch = fetch) {
  const sent = await gmail<{ id: string }>(session.accessToken, "/drafts/send", { method: "POST", body: JSON.stringify({ id: draftId }) }, f);
  return sent.id;
}

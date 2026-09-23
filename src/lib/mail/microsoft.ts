import { clip, htmlToText } from "@/lib/mail/format";
import type { ListInboxOptions, MailMessage, MailSummary, ProviderSession } from "@/lib/mail/types";

/**
 * Outlook.com / Hotmail / Microsoft 365 via Microsoft Graph.
 * Mail.ReadWrite is required to create reply drafts; COMMAND never deletes or moves mail.
 */

export const MICROSOFT_SCOPES = ["offline_access", "openid", "email", "User.Read", "Mail.ReadWrite", "Mail.Send"];
const LOGIN = "https://login.microsoftonline.com/common/oauth2/v2.0";
const GRAPH = "https://graph.microsoft.com/v1.0/me";
type Fetch = typeof fetch;

export function microsoftConfigured(env: Record<string, string | undefined> = process.env) {
  return Boolean(env.MICROSOFT_CLIENT_ID?.trim() && env.MICROSOFT_CLIENT_SECRET?.trim());
}

export function microsoftAuthUrl(redirectUri: string, state: string, env: Record<string, string | undefined> = process.env) {
  const url = new URL(`${LOGIN}/authorize`);
  url.search = new URLSearchParams({
    client_id: env.MICROSOFT_CLIENT_ID!.trim(),
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: MICROSOFT_SCOPES.join(" "),
    prompt: "select_account",
    state,
  }).toString();
  return url.toString();
}

async function token(body: Record<string, string>, f: Fetch, env: Record<string, string | undefined>) {
  const res = await f(`${LOGIN}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID!.trim(),
      client_secret: env.MICROSOFT_CLIENT_SECRET!.trim(),
      scope: MICROSOFT_SCOPES.join(" "),
      ...body,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(`Microsoft sign-in failed (${String(json.error ?? res.status)}).`);
  return json;
}

async function graph<T>(accessToken: string, path: string, init: RequestInit = {}, f: Fetch = fetch): Promise<T> {
  const res = await f(`${GRAPH}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: 'outlook.body-content-type="text"',
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Outlook request failed (${res.status}).`);
  if (res.status === 202 || res.status === 204) return {} as T;
  return (await res.json()) as T;
}

export async function microsoftExchangeCode(code: string, redirectUri: string, f: Fetch = fetch, env: Record<string, string | undefined> = process.env) {
  const json = await token({ code, redirect_uri: redirectUri, grant_type: "authorization_code" }, f, env);
  const accessToken = String(json.access_token ?? "");
  const refreshToken = String(json.refresh_token ?? "");
  if (!accessToken || !refreshToken) throw new Error("Microsoft did not return offline access.");
  const me = await graph<{ mail?: string | null; userPrincipalName?: string }>(accessToken, "?$select=mail,userPrincipalName", {}, f);
  const email = (me.mail || me.userPrincipalName || "").toLowerCase();
  if (!email) throw new Error("Microsoft did not return the mailbox address.");
  return { email, refreshToken, scopes: String(json.scope ?? "") };
}

/** Microsoft rotates refresh tokens: the caller must store the new one. */
export async function microsoftRefresh(refreshToken: string, f: Fetch = fetch, env: Record<string, string | undefined> = process.env) {
  const json = await token({ refresh_token: refreshToken, grant_type: "refresh_token" }, f, env);
  return {
    accessToken: String(json.access_token ?? ""),
    expiresIn: Number(json.expires_in ?? 3000),
    refreshToken: typeof json.refresh_token === "string" ? json.refresh_token : null,
  };
}

type Addr = { emailAddress?: { name?: string; address?: string } };
type GraphMessage = {
  id: string;
  conversationId?: string;
  subject?: string;
  from?: Addr;
  toRecipients?: Addr[];
  replyTo?: Addr[];
  receivedDateTime?: string;
  isRead?: boolean;
  bodyPreview?: string;
  body?: { contentType?: string; content?: string };
  internetMessageId?: string;
};

function fmt(a?: Addr) {
  const name = a?.emailAddress?.name?.trim();
  const address = a?.emailAddress?.address?.trim() ?? "";
  return name && name !== address ? `${name} <${address}>` : address;
}

function summary(accountId: string, account: string, m: GraphMessage): MailSummary {
  return {
    accountId,
    account,
    provider: "microsoft",
    id: m.id,
    threadId: m.conversationId ?? null,
    from: fmt(m.from),
    subject: m.subject || "(no subject)",
    date: m.receivedDateTime ?? null,
    snippet: (m.bodyPreview ?? "").slice(0, 300),
    unread: m.isRead === false,
  };
}

const SELECT = "id,conversationId,subject,from,receivedDateTime,isRead,bodyPreview";

export function graphListPath(opts: ListInboxOptions, now = Date.now()) {
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
  const params = new URLSearchParams({ $top: String(limit), $select: SELECT });
  if (opts.query?.trim()) {
    // Graph does not allow $orderby or $filter together with $search.
    params.set("$search", `"${opts.query.replace(/"/g, "").trim()}"`);
  } else {
    const filters: string[] = [];
    if (opts.unreadOnly) filters.push("isRead eq false");
    if (opts.sinceHours) filters.push(`receivedDateTime ge ${new Date(now - opts.sinceHours * 3_600_000).toISOString()}`);
    if (filters.length) params.set("$filter", filters.join(" and "));
    params.set("$orderby", "receivedDateTime desc");
  }
  // Graph OData parsing wants %20, not the + that URLSearchParams emits for spaces.
  return `/mailFolders/inbox/messages?${params.toString().replace(/\+/g, "%20")}`;
}

export async function microsoftList(
  session: ProviderSession,
  accountId: string,
  opts: ListInboxOptions,
  f: Fetch = fetch,
): Promise<MailSummary[]> {
  const res = await graph<{ value?: GraphMessage[] }>(session.accessToken, graphListPath(opts), {}, f);
  return (res.value ?? []).map((m) => summary(accountId, session.email, m));
}

export async function microsoftRead(session: ProviderSession, accountId: string, id: string, f: Fetch = fetch): Promise<MailMessage> {
  const m = await graph<GraphMessage>(
    session.accessToken,
    `/messages/${encodeURIComponent(id)}?$select=${SELECT},toRecipients,replyTo,body,internetMessageId`,
    {},
    f,
  );
  const content = m.body?.content ?? "";
  return {
    ...summary(accountId, session.email, m),
    to: (m.toRecipients ?? []).map(fmt).join(", "),
    replyTo: m.replyTo?.length ? fmt(m.replyTo[0]) : null,
    text: clip(m.body?.contentType === "html" ? htmlToText(content) : content.trim()),
    messageIdHeader: m.internetMessageId ?? null,
    references: null,
    untrustedContent: true,
  };
}

export async function microsoftCreateDraft(
  session: ProviderSession,
  input: { to: string; subject: string; body: string; replyToId?: string },
  f: Fetch = fetch,
) {
  if (input.replyToId) {
    // createReply keeps the thread and quotes the original under the comment.
    const draft = await graph<{ id: string }>(
      session.accessToken,
      `/messages/${encodeURIComponent(input.replyToId)}/createReply`,
      { method: "POST", body: JSON.stringify({ comment: input.body }) },
      f,
    );
    return draft.id;
  }
  const draft = await graph<{ id: string }>(
    session.accessToken,
    "/messages",
    {
      method: "POST",
      body: JSON.stringify({
        subject: input.subject,
        body: { contentType: "Text", content: input.body },
        toRecipients: [{ emailAddress: { address: input.to } }],
      }),
    },
    f,
  );
  return draft.id;
}

export async function microsoftSendDraft(session: ProviderSession, draftId: string, f: Fetch = fetch) {
  await graph(session.accessToken, `/messages/${encodeURIComponent(draftId)}/send`, { method: "POST" }, f);
  return draftId;
}

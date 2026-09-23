"use client";
import { useCallback, useEffect, useState } from "react";
import { requestCeoPrompt } from "@/lib/ceoBridge";
import { EmailDraftCard, type EmailDraftView } from "@/ui/EmailDraftCard";

type Account = {
  id: string;
  provider: "google" | "microsoft";
  email: string;
  status: "active" | "error" | "revoked";
  lastError: string | null;
};
type Setup = { google: boolean; microsoft: boolean; tokenKey: boolean };
type Summary = {
  accountId: string;
  account: string;
  provider: "google" | "microsoft";
  id: string;
  from: string;
  subject: string;
  date: string | null;
  snippet: string;
  unread: boolean;
};
type Message = Summary & { to: string; text: string };

const POLL_MS = 60_000;
const label = { google: "Gmail", microsoft: "Outlook" } as const;

async function json<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body;
}

/** Every connected Gmail / Outlook mailbox in one inbox. Cixy reads the same data. */
export function Inboxes() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [messages, setMessages] = useState<Summary[]>([]);
  const [errors, setErrors] = useState<Array<{ account: string; error: string }>>([]);
  const [filter, setFilter] = useState({ account: "", q: "", unread: false });
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Message | null>(null);
  const [reply, setReply] = useState("");
  const [draft, setDraft] = useState<EmailDraftView | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const connected = q.get("mail_connected");
    const failed = q.get("mail_error");
    if (connected) setNotice(`Connected ${connected}. Cixy can read it now.`);
    if (failed) setNotice(`Mailbox not connected: ${failed}`);
    if (connected || failed) window.history.replaceState(null, "", "/email");
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      const body = await json<{ accounts: Account[]; setup: Setup; error?: string }>(
        await fetch("/api/mail/accounts", { cache: "no-store" }),
      );
      setAccounts(body.accounts);
      setSetup(body.setup);
      if (body.error) setNotice(body.error);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Mailboxes unavailable.");
    }
  }, []);

  const loadInbox = useCallback(async () => {
    if (document.visibilityState === "hidden") return;
    const params = new URLSearchParams();
    if (filter.account) params.set("account", filter.account);
    if (filter.q.trim()) params.set("q", filter.q.trim());
    if (filter.unread) params.set("unread", "1");
    try {
      const body = await json<{ messages: Summary[]; errors: Array<{ account: string; error: string }> }>(
        await fetch(`/api/mail/inbox?${params}`, { cache: "no-store" }),
      );
      setMessages(body.messages);
      setErrors(body.errors);
    } catch (e) {
      setErrors([{ account: "inbox", error: e instanceof Error ? e.message : "Inbox unavailable." }]);
    }
  }, [filter]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    if (!accounts.length) return;
    void loadInbox();
    const id = window.setInterval(() => void loadInbox(), POLL_MS);
    return () => window.clearInterval(id);
  }, [accounts.length, loadInbox]);

  async function openMessage(m: Summary) {
    setBusy(true);
    setDraft(null);
    setReply("");
    try {
      setOpen(
        await json<Message>(
          await fetch(`/api/mail/inbox?account=${encodeURIComponent(m.accountId)}&message=${encodeURIComponent(m.id)}`, {
            cache: "no-store",
          }),
        ),
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Message unavailable.");
    } finally {
      setBusy(false);
    }
  }

  async function saveReply() {
    if (!open || !reply.trim()) return;
    setBusy(true);
    try {
      setDraft(
        await json<EmailDraftView>(
          await fetch("/api/mail/draft", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accountId: open.accountId, messageId: open.id, body: reply }),
          }),
        ),
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Draft not saved.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect(a: Account) {
    if (!window.confirm(`Disconnect ${a.email}? Cixy will stop reading it.`)) return;
    try {
      await json(await fetch(`/api/mail/accounts?id=${encodeURIComponent(a.id)}`, { method: "DELETE" }));
      setNotice(`Disconnected ${a.email}.`);
      void loadAccounts();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not disconnect.");
    }
  }

  function askCixy(prompt: string) {
    requestCeoPrompt(prompt);
  }

  const unread = messages.filter((m) => m.unread).length;

  return (
    <div className="team-agent" style={{ gridColumn: "1 / -1" }}>
      <h2>Your inboxes</h2>
      {notice && <p role="status">{notice}</p>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {accounts.map((a) => (
          <span
            key={a.id}
            title={a.lastError ?? undefined}
            style={{ border: "1px solid #344b58", borderRadius: 999, padding: "4px 10px" }}
          >
            {label[a.provider]} · {a.email} {a.status === "error" ? "· needs reconnect" : ""}{" "}
            <button type="button" onClick={() => void disconnect(a)} aria-label={`Disconnect ${a.email}`}>
              ×
            </button>
          </span>
        ))}
        <button type="button" style={{ border: "1px solid #7dd3fc", borderRadius: 999, padding: "4px 12px" }} onClick={() => window.location.assign("/api/mail/connect/google")}>
          + Connect Gmail
        </button>
        <button type="button" style={{ border: "1px solid #7dd3fc", borderRadius: 999, padding: "4px 12px" }} onClick={() => window.location.assign("/api/mail/connect/microsoft")}>
          + Connect Outlook
        </button>
      </div>
      {setup && (!setup.google || !setup.microsoft || !setup.tokenKey) && (
        <p style={{ opacity: 0.8 }}>
          Setup still needed:{" "}
          {[
            !setup.tokenKey && "MAIL_TOKEN_KEY",
            !setup.google && "GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET (Gmail)",
            !setup.microsoft && "MICROSOFT_CLIENT_ID + MICROSOFT_CLIENT_SECRET (Outlook)",
          ]
            .filter(Boolean)
            .join(" · ")}
          . See docs/KEYS_TOMORROW.md.
        </p>
      )}

      {accounts.length > 0 && (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (search !== filter.q) setFilter({ ...filter, q: search });
              else void loadInbox();
            }}
            style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "12px 0" }}
          >
            <select value={filter.account} onChange={(e) => setFilter({ ...filter, account: e.target.value })}>
              <option value="">All inboxes</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.email}
                </option>
              ))}
            </select>
            <input
              placeholder="Search mail"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: "#081923", padding: 8, minWidth: 180 }}
            />
            <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={filter.unread}
                onChange={(e) => setFilter({ ...filter, unread: e.target.checked })}
              />
              Unread only
            </label>
            <button disabled={busy}>Search / refresh</button>
            <button type="button" onClick={() => askCixy("Give me an overview of my email from the last 24 hours: what needs a reply, what's FYI, what's noise.")}>
              Ask Cixy for an overview
            </button>
          </form>
          <p style={{ opacity: 0.8 }}>
            {messages.length} messages · {unread} unread · refreshes every minute
          </p>
          {errors.map((e) => (
            <p key={e.account} role="alert">
              {e.account}: {e.error}
            </p>
          ))}

          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))" }}>
            <ul style={{ maxHeight: 520, overflow: "auto", listStyle: "none", padding: 0, margin: 0 }}>
              {messages.map((m) => (
                <li key={`${m.accountId}:${m.id}`} style={{ borderBottom: "1px solid #344b58", padding: "8px 0" }}>
                  <button
                    type="button"
                    onClick={() => void openMessage(m)}
                    style={{ textAlign: "left", width: "100%", fontWeight: m.unread ? 700 : 400 }}
                  >
                    {m.unread ? "● " : ""}
                    {m.subject}
                    <br />
                    <small style={{ opacity: 0.75 }}>
                      {m.from} · {m.account}
                      {m.date ? ` · ${new Date(m.date).toLocaleString()}` : ""}
                    </small>
                    <br />
                    <small style={{ opacity: 0.6 }}>{m.snippet}</small>
                  </button>
                </li>
              ))}
              {!messages.length && <li>No messages match.</li>}
            </ul>

            <div>
              {open ? (
                <div className="team-controls">
                  <h2>{open.subject}</h2>
                  <p>
                    From: {open.from}
                    <br />
                    To: {open.to}
                    <br />
                    In: {open.account}
                  </p>
                  <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", maxHeight: 280, overflow: "auto" }}>
                    {open.text}
                  </pre>
                  <label>
                    Reply
                    <textarea value={reply} onChange={(e) => setReply(e.target.value)} maxLength={20000} />
                  </label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" disabled={busy || !reply.trim()} onClick={() => void saveReply()}>
                      Save reply draft
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        askCixy(
                          `Draft a reply to the email "${open.subject}" from ${open.from} in ${open.account} (accountId ${open.accountId}, messageId ${open.id}). Read it first.`,
                        )
                      }
                    >
                      Ask Cixy to draft
                    </button>
                    <button type="button" onClick={() => setOpen(null)}>
                      Close
                    </button>
                  </div>
                  {draft && <EmailDraftCard draft={draft} />}
                </div>
              ) : (
                <p>Select a message to read it and reply.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

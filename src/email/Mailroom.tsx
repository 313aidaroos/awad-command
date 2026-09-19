"use client";
import { useEffect, useState } from "react";
import { projects } from "@/projects/registry";
import "@/workforce/teams.css";
type Draft = {
  id: string;
  recipient: string;
  sender: string;
  subject: string;
  body: string;
  status: string;
};
type Message = { id: string; from: string; subject: string };
export function Mailroom() {
  const [resultNotice, setResultNotice] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]),
    [messages, setMessages] = useState<Message[]>([]),
    [notice, setNotice] = useState("Loading drafts…"),
    [incoming, setIncoming] = useState(""),
    [busy, setBusy] = useState(false),
    [refresh, setRefresh] = useState(0);
  const [to, setTo] = useState(""),
    [subject, setSubject] = useState(""),
    [body, setBody] = useState(""),
    [business, setBusiness] = useState(""),
    [selected, setSelected] = useState<Draft | null>(null),
    [received, setReceived] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/email", { cache: "no-store", signal: controller.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setDrafts(d.drafts);
        setNotice(
          d.sendingConfigured
            ? "Resend key configured · sender verification is checked on submission."
            : "Sending connection missing.",
        );
      })
      .catch((e) => {
        if (!controller.signal.aborted) setNotice(e.message);
      });
    return () => controller.abort();
  }, [refresh]);
  async function action(payload: object) {
    setBusy(true);
    try {
      const r = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setResultNotice(d.message);
      setSelected(null);
      setRefresh((n) => n + 1);
      return true;
    } catch (e) {
      setSelected(null);
      setResultNotice(
        e instanceof Error
          ? e.message
          : "Action unconfirmed. Refresh before retrying.",
      );
      setRefresh((n) => n + 1);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function inbox(id?: string) {
    setBusy(true);
    try {
      const r = await fetch(
        id
          ? `/api/email?message=${encodeURIComponent(id)}`
          : "/api/email?view=received",
        { cache: "no-store" },
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (id) setReceived(`${d.from}\n${d.subject}\n\n${d.text}`);
      else {
        setMessages(d.messages);
        setIncoming(
          `${d.messages.length} messages in the most recent Resend page. ${d.hasMore ? "More mail exists at the provider." : ""}`,
        );
      }
    } catch (e) {
      setIncoming(e instanceof Error ? e.message : "Receiving unavailable.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="team-desk">
      <header>
        <div>
          <small>CIXY / MAILROOM</small>
          <h1>YOUR EMAIL DESK</h1>
          <p>Awad and business aliases · @apixis.dev</p>
        </div>
        <button disabled={busy} onClick={() => setRefresh((n) => n + 1)}>
          Refresh drafts
        </button>
      </header>
      <p role="status">{notice}</p>
      <p role="status">{resultNotice}</p>
      <div className="team-connections">
        <strong>Inbox connection</strong>
        <p>
          Your business aliases continue forwarding to awad@apixis.dev. The
          received-mail view below only reads messages routed through Resend.
          Your full Gmail inbox is not connected here yet.
        </p>
      </div>
      <div className="team-grid">
        <form
          className="team-agent team-controls"
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              await action({
                action: "draft",
                to,
                subject,
                body,
                business: business || undefined,
              })
            ) {
              setTo("");
              setSubject("");
              setBody("");
            }
          }}
        >
          <h2>Compose a draft</h2>
          <p>
            Ask Cixy to draft an email, or write it here. Saved drafts appear
            alongside this form.
          </p>
          <label>
            From
            <select
              value={business}
              onChange={(e) => setBusiness(e.target.value)}
            >
              <option value="">Awad · awad@apixis.dev</option>
              {projects.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name} · {p.slug === "content" ? "contentbot" : p.slug}
                  @apixis.dev
                </option>
              ))}
            </select>
          </label>
          <label>
            To
            <input
              required
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={{ background: "#081923", padding: 10 }}
            />
          </label>
          <label>
            Subject
            <input
              required
              maxLength={250}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={{ background: "#081923", padding: 10 }}
            />
          </label>
          <label>
            Message
            <textarea
              required
              maxLength={20000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <button disabled={busy}>Save draft</button>
        </form>
        <div className="team-agent">
          <h2>Drafts & submissions</h2>
          {!drafts.length && <p>No saved drafts.</p>}
          {drafts.map((d) => (
            <div
              key={d.id}
              style={{ borderBottom: "1px solid #344b58", padding: "12px 0" }}
            >
              <button onClick={() => setSelected(d)}>{d.subject}</button>
              <p>
                {d.recipient} · {d.status}
              </p>
            </div>
          ))}
          {selected && (
            <div className="team-controls">
              <h2>{selected.subject}</h2>
              <p>
                From: {selected.sender}
                <br />
                To: {selected.recipient}
              </p>
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
                {selected.body}
              </pre>
              <p>Status: {selected.status}</p>
              {selected.status === "draft" && (
                <button
                  disabled={busy}
                  onClick={() =>
                    action({ action: "send", draftId: selected.id })
                  }
                >
                  Send this email
                </button>
              )}
              {selected.status === "unconfirmed" && (
                <p>
                  Check Resend before sending again. This attempt will not be
                  retried automatically.
                </p>
              )}
              <button onClick={() => setSelected(null)}>Close email</button>
            </div>
          )}
        </div>
        <div className="team-agent">
          <h2>Received through Resend</h2>
          <button disabled={busy} onClick={() => inbox()}>
            Check received mail
          </button>
          <p role="status">{incoming}</p>
          {messages.map((m) => (
            <div key={m.id}>
              <button disabled={busy} onClick={() => inbox(m.id)}>
                {m.subject || "(No subject)"}
              </button>
              <p>{m.from}</p>
            </div>
          ))}
          {received && (
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
              {received}
            </pre>
          )}
        </div>
      </div>
    </section>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
type Turn = {
  id: string;
  message: string;
  reply: string | null;
  status: string;
};
export function OfficeChat({ agentId }: { agentId: string }) {
  const [turns, setTurns] = useState<Turn[]>([]),
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0);
  const lock = useRef(false),
    scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const c = new AbortController();
    fetch(`/api/office-chat?agentId=${encodeURIComponent(agentId)}`, {
      cache: "no-store",
      signal: c.signal,
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setTurns(d.turns);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [agentId, refresh]);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [turns, busy]);
  async function send() {
    if (lock.current || !text.trim()) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const message = text.trim(),
      id = crypto.randomUUID();
    try {
      const r = await fetch("/api/office-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, message, requestId: id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setTurns((t) => [
        ...t,
        { id, message, reply: d.reply, status: "replied" },
      ]);
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reply unavailable.");
    } finally {
      lock.current = false;
      setBusy(false);
      setRefresh((n) => n + 1);
    }
  }
  return (
    <div className="office-direct-chat">
      <p className="lead-chat-note">
        Direct office AI · advice and drafts. External actions need their
        connected tools.
      </p>
      <div
        ref={scroller}
        style={{ maxHeight: 280, overflowY: "auto", padding: 12 }}
        aria-live="polite"
      >
        {!turns.length && (
          <p>Ask about this business, request a draft, or discuss a task.</p>
        )}
        {turns.map((t) => (
          <div key={t.id} style={{ marginBottom: 16 }}>
            <p>
              <strong>You:</strong> {t.message}
            </p>
            {t.reply ? (
              <p style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>
                <strong>Agent:</strong> {t.reply}
              </p>
            ) : (
              <p>
                {t.status === "thinking"
                  ? "Reply pending…"
                  : "No reply received for this message."}
              </p>
            )}
          </div>
        ))}
        {busy && <p role="status">Agent is replying…</p>}
      </div>
      <p role="alert" style={{ color: "#edbd86", padding: "0 12px" }}>
        {error}
      </p>
      <label style={{ display: "block", padding: 12 }}>
        Message
        <textarea
          aria-label="Message office agent"
          value={text}
          maxLength={4000}
          disabled={busy}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              void send();
            }
          }}
          style={{
            display: "block",
            width: "100%",
            minHeight: 80,
            background: "#081823",
            padding: 10,
          }}
        />
      </label>
      <div style={{ display: "flex", gap: 12, padding: 12 }}>
        <button disabled={busy || !text.trim()} onClick={send}>
          {busy ? "Waiting for reply…" : "Send message"}
        </button>
        <button disabled={busy} onClick={() => setRefresh((n) => n + 1)}>
          Refresh conversation
        </button>
      </div>
    </div>
  );
}

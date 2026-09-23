"use client";
import { useState } from "react";

export interface EmailDraftView {
  accountId: string;
  account: string;
  provider: "google" | "microsoft";
  draftId: string;
  to: string;
  subject: string;
  body: string;
}

/** Cixy saved this draft in the real mailbox. Only this button (the owner's tap) sends it. */
export function EmailDraftCard({ draft }: { draft: EmailDraftView }) {
  const [state, setState] = useState<"draft" | "sending" | "sent" | "error">("draft");
  const [note, setNote] = useState("");
  async function send() {
    if (state !== "draft" && state !== "error") return;
    setState("sending");
    try {
      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: draft.accountId, draftId: draft.draftId }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setState("sent");
      setNote(body.message ?? "Sent.");
    } catch (e) {
      setState("error");
      setNote(e instanceof Error ? e.message : "Send failed. Check the draft in your mail app.");
    }
  }
  return (
    <div
      className="mt-2 rounded-lg border border-white/15 bg-black/40 p-3 text-left text-xs"
      aria-label={`Email draft to ${draft.to}`}
    >
      <div className="text-[10px] tracking-[.18em] text-amber-200">
        DRAFT · {draft.provider === "google" ? "GMAIL" : "OUTLOOK"} · {draft.account}
      </div>
      <div className="mt-1 text-slate-300">To: {draft.to}</div>
      <div className="text-slate-300">Subject: {draft.subject}</div>
      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-[inherit] text-slate-200">{draft.body}</pre>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {state !== "sent" && (
          <button
            type="button"
            onClick={() => void send()}
            disabled={state === "sending"}
            className="rounded-full bg-amber-200 px-3 py-1 font-medium text-slate-950 disabled:opacity-60"
          >
            {state === "sending" ? "Sending…" : state === "error" ? "Try send again" : "Send"}
          </button>
        )}
        <span className="text-slate-400">
          {state === "sent"
            ? note
            : state === "error"
              ? note
              : "Saved in your Drafts. Edit it there, or send as is."}
        </span>
      </div>
    </div>
  );
}

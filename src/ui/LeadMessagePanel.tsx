'use client';

import { useState } from 'react';
import { getLeadBySlug } from '@/config/orbLeads';
import { uid } from '@/lib/ids';
import { useCommandStore } from '@/store/useCommandStore';

export function LeadMessagePanel({ slug }: { slug: string }) {
  const lead = getLeadBySlug(slug);
  const queue = useCommandStore((s) => s.queueLeadMessage);
  const applyEvent = useCommandStore((s) => s.applyEvent);
  const leadMessages = useCommandStore((s) => s.leadMessages);
  const messages = leadMessages.filter((m) => m.projectSlug === slug).slice(0, 4);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  if (!lead) {
    return <p className="mt-3 text-[11px] text-[var(--muted)]">No hub lead is wired to this orb yet.</p>;
  }

  async function send() {
    const message = text.trim();
    if (!message || busy || !lead) return;
    setBusy(true);
    setHint(null);
    try {
      const res = await fetch('/api/lead-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectSlug: slug, message }),
      });
      const body = (await res.json()) as {
        status: 'queued' | 'delivered' | 'failed';
        demo?: boolean;
        error?: string;
      };
      const record = {
        id: uid('lm'),
        projectSlug: slug,
        leadName: lead.leadName,
        agentId: lead.agentId,
        message,
        status: body.status,
        ts: Date.now(),
        error: body.error,
      };
      queue(record);
      applyEvent({
        id: record.id,
        ts: record.ts,
        type:
          body.status === 'delivered'
            ? 'lead.message.delivered'
            : body.status === 'failed'
              ? 'lead.message.failed'
              : 'lead.message.queued',
        projectSlug: slug,
        summary:
          body.status === 'delivered'
            ? `Message delivered to ${lead.leadName}`
            : body.status === 'failed'
              ? `Lead message failed · ${lead.leadName}`
              : `Message queued for ${lead.leadName}`,
        source: 'demo',
        payload: { demo: body.demo ?? false },
      });
      setHint(
        body.status === 'delivered'
          ? 'Delivered'
          : body.status === 'failed'
            ? body.error ?? 'Not delivered'
            : 'Queued · DEMO',
      );
      if (body.status !== 'failed') setText('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 border-t border-[var(--line)] pt-3">
      <div className="text-[10px] tracking-[0.14em] text-[var(--muted)] mb-2">Message lead</div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Talk to ${lead.leadName}…`}
        className="w-full min-h-16 resize-none rounded-lg bg-black/30 px-2.5 py-2 text-xs text-[var(--text)] outline-none border border-[var(--line)]"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => void send()}
          disabled={busy || !text.trim()}
          className="rounded-full bg-[var(--accent)]/20 px-3 py-1 text-[11px] text-[var(--text)] disabled:opacity-40"
        >
          {busy ? 'Sending' : 'Send'}
        </button>
        {hint ? <span className="font-num text-[10px] text-[var(--muted)]">{hint}</span> : null}
      </div>
      {messages.map((item) => (
        <div key={item.id} className="mt-2 text-[11px] text-[var(--muted)]">
          <span className="tag" style={{ marginLeft: 0, marginRight: 6 }}>
            {item.status === 'delivered' ? 'sent' : item.status}
          </span>
          {item.message}
        </div>
      ))}
    </div>
  );
}

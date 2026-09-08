'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getLeadBySlug } from '@/config/orbLeads';
import { clock } from '@/lib/format';
import { uid } from '@/lib/ids';
import { useCommandStore } from '@/store/useCommandStore';
import type { LeadMessage } from '@/types/approval';
import type { EventType } from '@/types/events';

const POLL_MS = 3500;
const THREAD_LIMIT = 16;

function directionOf(item: LeadMessage): 'outbound' | 'inbound' {
  return item.direction ?? 'outbound';
}

export function LeadMessagePanel({ slug }: { slug: string }) {
  const lead = getLeadBySlug(slug);
  const queue = useCommandStore((s) => s.queueLeadMessage);
  const mergeLeadMessages = useCommandStore((s) => s.mergeLeadMessages);
  const applyEvent = useCommandStore((s) => s.applyEvent);
  const leadMessages = useCommandStore((s) => s.leadMessages);
  const thread = useMemo(
    () =>
      leadMessages
        .filter((item) => item.projectSlug === slug)
        .sort((a, b) => a.ts - b.ts)
        .slice(-THREAD_LIMIT),
    [leadMessages, slug],
  );
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const seenRef = useRef(new Set<string>());
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    seenRef.current = new Set(
      useCommandStore
        .getState()
        .leadMessages.filter((item) => item.projectSlug === slug)
        .map((item) => item.id),
    );
  }, [slug]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [thread.length]);

  useEffect(() => {
    let cancelled = false;

    async function pull() {
      try {
        const res = await fetch(`/api/lead-thread?projectSlug=${encodeURIComponent(slug)}`, {
          cache: 'no-store',
        });
        if (!res.ok || cancelled) return;
        const body = (await res.json()) as { messages?: LeadMessage[] };
        const incoming = body.messages ?? [];
        if (incoming.length === 0) return;
        mergeLeadMessages(incoming);
        for (const item of incoming) {
          if (seenRef.current.has(item.id)) continue;
          seenRef.current.add(item.id);
          if (directionOf(item) !== 'inbound') continue;
          applyEvent({
            id: `evt_${item.id}`,
            ts: item.ts,
            type: 'lead.message.replied' satisfies EventType,
            projectSlug: item.projectSlug,
            agentId: item.agentId,
            summary: `${item.leadName} replied`,
            source: 'live',
            payload: { message: item.message },
          });
          setHint('Reply received');
        }
      } catch {
        // Thread stays on last known store state.
      }
    }

    void pull();
    const timer = window.setInterval(() => void pull(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [slug, mergeLeadMessages, applyEvent]);

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
        id?: string;
        ts?: number;
      };
      const record: LeadMessage = {
        id: body.id ?? uid('lm'),
        projectSlug: slug,
        leadName: lead.leadName,
        agentId: lead.agentId,
        message,
        status: body.status,
        ts: body.ts ?? Date.now(),
        error: body.error,
        direction: 'outbound',
      };
      seenRef.current.add(record.id);
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
      <div
        ref={scrollerRef}
        className="mb-2 max-h-44 overflow-y-auto pr-0.5"
        aria-live="polite"
        aria-label="Lead conversation"
      >
        {thread.length === 0 ? (
          <p className="text-[11px] text-[var(--muted)]">No messages yet. Replies from this lead land here.</p>
        ) : (
          thread.map((item) => {
            const inbound = directionOf(item) === 'inbound';
            return (
              <div key={item.id} className="mb-2.5 last:mb-0">
                <div className="flex items-center justify-between gap-2 text-[10px] text-[var(--muted)]">
                  <span>
                    <span className="tag" style={{ marginLeft: 0, marginRight: 6 }}>
                      {inbound ? 'lead' : item.status === 'delivered' ? 'sent' : item.status}
                    </span>
                    {inbound ? item.leadName : 'You'}
                  </span>
                  <span className="font-num">{clock(item.ts)}</span>
                </div>
                <p className={`mt-1 text-[11px] leading-relaxed ${inbound ? 'text-[var(--text)]' : 'text-[var(--muted)]'}`}>
                  {item.message}
                </p>
              </div>
            );
          })
        )}
      </div>
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
    </div>
  );
}

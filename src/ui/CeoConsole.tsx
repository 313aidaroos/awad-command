'use client';

import { useState } from 'react';
import { parseIntents } from '@/ceo/intents';
import { useVoice } from '@/lib/voice';
import { Glass } from '@/ui/Glass';
import { useCommandStore } from '@/store/useCommandStore';

interface ChatTurn {
  role: 'user' | 'ceo';
  text: string;
  note?: string;
}

export function CeoConsole() {
  const view = useCommandStore((s) => s.view);
  const dataMode = useCommandStore((s) => s.dataMode);
  const store = useCommandStore;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const voice = useVoice();

  if (view === 'boot') return null;

  function runIntents(text: string): string | undefined {
    const intents = parseIntents(text);
    const s = store.getState();
    for (const intent of intents) {
      if (intent.type === 'enter') s.enterProject(intent.slug);
      if (intent.type === 'universe') s.returnToUniverse();
      if (intent.type === 'mode') s.setMode(intent.mode);
      if (intent.type === 'problems') {
        const slug =
          Object.entries(s.projects).find(([, p]) => p.status === 'attention')?.[0] ?? 'rawixis';
        s.enterProject(slug);
      }
    }
    const last = intents.at(-1);
    if (last?.type === 'enter') return `Navigated to ${last.slug}`;
    if (last?.type === 'problems') return 'Opened the attention project';
    return undefined;
  }

  async function ask(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setOpen(true);
    setInput('');
    setTurns((prev) => [...prev, { role: 'user', text: message }]);
    const note = runIntents(message);
    setBusy(true);
    try {
      const snapshot = store.getState();
      const res = await fetch('/api/ceo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...turns, { role: 'user', text: message }].map((t) => ({
            role: t.role === 'ceo' ? 'assistant' : 'user',
            content: t.text,
          })),
          context: {
            dataMode: snapshot.dataMode,
            projects: snapshot.projects,
            agents: snapshot.agents,
            events: snapshot.events,
            approvals: snapshot.approvals,
          },
        }),
      });
      const body = (await res.json()) as {
        text: string;
        approval?: { title: string; description: string; kind: 'deploy' | 'campaign' | 'financial' | 'other'; risk: 'low' | 'medium' | 'high' };
      };
      if (body.approval) snapshot.requestApproval(body.approval);
      setTurns((prev) => [...prev, { role: 'ceo', text: body.text, note }]);
      if (!snapshot.voiceMuted) voice.speak(body.text);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pointer-events-auto fixed bottom-[22px] left-1/2 z-30 w-[min(520px,calc(100%-32px))] -translate-x-1/2">
      {open ? (
        <Glass className="mb-2 max-h-[55vh] overflow-auto p-3.5">
          <div className="mb-2 flex items-center justify-between text-[10px] tracking-[0.14em] text-[var(--muted)]">
            <span>AWAD CEO {dataMode === 'demo' ? <span className="tag">demo data</span> : null}</span>
            <button type="button" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
          <div className="space-y-2 text-[13px]">
            {turns.map((turn, i) => (
              <div key={i} className={turn.role === 'user' ? 'text-[var(--muted)]' : 'text-[var(--text)]'}>
                {turn.text}
                {turn.note ? <div className="mt-1 text-[10px] text-[var(--accent)]">{turn.note}</div> : null}
              </div>
            ))}
            {busy ? <div className="text-[var(--muted)]">Thinking…</div> : null}
          </div>
        </Glass>
      ) : null}
      <Glass className="flex items-center gap-3 px-[18px] py-3 text-[13px] text-[var(--muted)]">
        <span className="dot" style={{ background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)' }} />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void ask(input);
          }}
          placeholder="Ask AWAD CEO — “what needs my attention?”"
          className="w-full bg-transparent text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
        />
        <button
          type="button"
          aria-label="Voice"
          onClick={() => {
            if (!voice.supported) return;
            if (voice.listening) voice.stop();
            else voice.start((text) => void ask(text));
          }}
          className="grid h-[26px] w-[26px] place-items-center rounded-full border border-[var(--line)] text-xs"
        >
          {voice.listening ? '●' : '🎙'}
        </button>
      </Glass>
    </div>
  );
}

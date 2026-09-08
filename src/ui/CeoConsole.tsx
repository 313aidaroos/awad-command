'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  const voiceMuted = useCommandStore((s) => s.voiceMuted);
  const setVoiceMuted = useCommandStore((s) => s.setVoiceMuted);
  const store = useCommandStore;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [hud, setHud] = useState<string | null>(null);
  const voice = useVoice();
  const { speak, prime, start, stop, clearHint } = voice;
  const turnsRef = useRef(turns);
  const busyRef = useRef(busy);
  const voiceMutedRef = useRef(voiceMuted);
  turnsRef.current = turns;
  busyRef.current = busy;
  voiceMutedRef.current = voiceMuted;

  const clearVoiceHint = clearHint;
  useEffect(() => {
    if (!voice.hint && !hud) return;
    const id = window.setTimeout(() => {
      clearVoiceHint();
      setHud(null);
    }, 5200);
    return () => window.clearTimeout(id);
  }, [clearVoiceHint, voice.hint, hud]);

  const runIntents = useCallback((text: string): string | undefined => {
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
  }, [store]);

  const ask = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || busyRef.current) return;
      if (!voiceMutedRef.current) prime();
      setOpen(true);
      setInput('');
      setTurns((prev) => [...prev, { role: 'user', text: message }]);
      const note = runIntents(message);
      setBusy(true);
      try {
        const snapshot = store.getState();
        const history = [...turnsRef.current, { role: 'user' as const, text: message }].map((t) => ({
          role: t.role === 'ceo' ? ('assistant' as const) : ('user' as const),
          content: t.text,
        }));
        const res = await fetch('/api/ceo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: history,
            context: {
              dataMode: snapshot.dataMode,
              projects: snapshot.projects,
              agents: snapshot.agents,
              events: snapshot.events,
              approvals: snapshot.approvals,
            },
          }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          text?: string;
          error?: string;
          approval?: {
            title: string;
            description: string;
            kind: 'deploy' | 'campaign' | 'financial' | 'other';
            risk: 'low' | 'medium' | 'high';
          };
        };
        const reply = (body.text ?? '').trim() || body.error || 'CEO did not return a reply.';
        if (body.approval) snapshot.requestApproval(body.approval);
        setTurns((prev) => [...prev, { role: 'ceo', text: reply, note }]);
        if (!voiceMutedRef.current && body.text) speak(reply);
      } catch {
        const fallback = 'CEO is unreachable. Try again in a moment.';
        setTurns((prev) => [...prev, { role: 'ceo', text: fallback }]);
        setHud(fallback);
      } finally {
        setBusy(false);
      }
    },
    [prime, runIntents, speak, store],
  );

  const toggleMic = useCallback(() => {
    if (voice.listening) {
      stop();
      return;
    }
    if (!voice.supported) {
      setHud(voice.unsupportedHint);
      return;
    }
    start((spoken) => void ask(spoken));
  }, [ask, start, stop, voice.listening, voice.supported, voice.unsupportedHint]);

  if (view === 'boot') return null;
  if (view !== 'universe' && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass pointer-events-auto fixed bottom-5 left-1/2 z-30 -translate-x-1/2 px-3.5 py-1.5 text-[11px] text-[var(--muted)]"
      >
        Ask CEO
      </button>
    );
  }

  const displayValue = voice.listening ? voice.interim : input;
  const banner = voice.hint ?? hud;

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
      {banner ? (
        <div className="mb-2 text-center text-[11px] text-[var(--muted)]" role="status">
          {banner}
        </div>
      ) : null}
      <Glass
        className={`flex items-center gap-3 px-[18px] py-3 text-[13px] text-[var(--muted)] ${
          voice.listening ? 'mic-listening-bar' : ''
        }`}
      >
        <span
          className={`dot ${voice.listening ? 'mic-listening-dot' : ''}`}
          style={{ background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)' }}
        />
        <input
          value={displayValue}
          readOnly={voice.listening}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void ask(input);
          }}
          placeholder={voice.listening ? 'Listening…' : 'Ask AWAD CEO — “what needs my attention?”'}
          className={`w-full bg-transparent text-[var(--text)] outline-none placeholder:text-[var(--muted)] ${
            voice.listening ? 'italic text-[var(--accent)]' : ''
          }`}
          aria-label="Ask AWAD CEO"
        />
        <button
          type="button"
          aria-label={voiceMuted ? 'Unmute spoken replies' : 'Mute spoken replies'}
          title={voiceMuted ? 'Spoken replies off' : 'Spoken replies on'}
          onClick={() => setVoiceMuted(!voiceMuted)}
          className="grid h-[26px] w-[26px] place-items-center rounded-full border border-[var(--line)] text-[11px] text-[var(--muted)]"
        >
          {voiceMuted ? '🔇' : '🔊'}
        </button>
        <button
          type="button"
          aria-label={voice.listening ? 'Stop listening' : 'Start listening'}
          aria-pressed={voice.listening}
          title={voice.supported ? (voice.listening ? 'Stop' : 'Speak') : voice.unsupportedHint}
          onClick={toggleMic}
          className={`grid h-[26px] w-[26px] place-items-center rounded-full border text-xs ${
            voice.listening
              ? 'mic-listening border-[var(--accent)] text-[var(--accent)]'
              : 'border-[var(--line)]'
          }`}
        >
          {voice.listening ? '●' : '🎙'}
        </button>
      </Glass>
    </div>
  );
}

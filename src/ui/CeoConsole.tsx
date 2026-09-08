'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { applyCeoClientActions } from '@/ceo/applyClientActions';
import { parseIntents } from '@/ceo/intents';
import type { CeoClientAction } from '@/ceo/tools.types';
import { CEO_OPEN_EVENT } from '@/lib/ceoBridge';
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
  const inputRef = useRef<HTMLInputElement>(null);
  turnsRef.current = turns;
  busyRef.current = busy;
  voiceMutedRef.current = voiceMuted;

  useEffect(() => {
    const openCeo = () => {
      setOpen(true);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    };
    window.addEventListener(CEO_OPEN_EVENT, openCeo);
    return () => window.removeEventListener(CEO_OPEN_EVENT, openCeo);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

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
          actions?: CeoClientAction[];
        };
        const actionNotes = applyCeoClientActions(body.actions ?? [], store);
        const reply = (body.text ?? '').trim() || body.error || 'CEO did not return a reply.';
        if (body.approval && !(body.actions ?? []).some((action) => action.name === 'propose_approval')) {
          snapshot.requestApproval(body.approval);
        }
        const combinedNote = [note, ...actionNotes].filter(Boolean).join(' · ') || undefined;
        setTurns((prev) => [...prev, { role: 'ceo', text: reply, note: combinedNote }]);
        if (!voiceMutedRef.current && reply) speak(reply);
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

  const displayValue = voice.listening ? voice.interim : input;
  const banner = voice.hint ?? hud;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pointer-events-auto fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full border border-[var(--line)] bg-[rgba(23,26,31,0.45)] px-3 py-1.5 text-[11px] tracking-[0.16em] text-[var(--muted)]"
      >
        <span className="dot" style={{ marginRight: 0 }} />
        CEO
      </button>
    );
  }

  return (
    <div className="pointer-events-auto fixed bottom-4 right-4 z-30 w-[min(360px,calc(100%-32px))]">
      <Glass className="mb-2 max-h-[46vh] overflow-auto p-3">
        <div className="mb-2 flex items-center justify-between text-[10px] tracking-[0.14em] text-[var(--muted)]">
          <span>AWAD CEO {dataMode === 'demo' ? <span className="tag">DEMO</span> : null}</span>
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
      {banner ? (
        <div className="mb-2 text-right text-[11px] text-[var(--muted)]" role="status">
          {banner}
        </div>
      ) : null}
      <Glass
        className={`flex items-center gap-2 px-3 py-2 text-[12px] text-[var(--muted)] ${
          voice.listening ? 'mic-listening-bar' : ''
        }`}
      >
        <span
          className={`dot ${voice.listening ? 'mic-listening-dot' : ''}`}
          style={{ background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)', marginRight: 0 }}
        />
        <input
          ref={inputRef}
          data-awad-ceo-input
          value={displayValue}
          readOnly={voice.listening}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void ask(input);
          }}
          placeholder={voice.listening ? 'Listening…' : 'Ask AWAD CEO…'}
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
          className="grid h-[24px] w-[24px] place-items-center rounded-full border border-[var(--line)] text-[11px] text-[var(--muted)]"
        >
          {voiceMuted ? '🔇' : '🔊'}
        </button>
        <button
          type="button"
          aria-label={voice.listening ? 'Stop listening' : 'Start listening'}
          aria-pressed={voice.listening}
          title={voice.supported ? (voice.listening ? 'Stop' : 'Speak') : voice.unsupportedHint}
          onClick={toggleMic}
          className={`grid h-[24px] w-[24px] place-items-center rounded-full border text-xs ${
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

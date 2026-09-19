"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { applyCeoClientActions } from "@/ceo/applyClientActions";
import { parseIntents } from "@/ceo/intents";
import type { CeoClientAction } from "@/ceo/tools.types";
import { HUD_COPY } from "@/lib/branding";
import { CEO_OPEN_EVENT } from "@/lib/ceoBridge";
import { useVoice } from "@/lib/voice";
import { Glass } from "@/ui/Glass";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Keyboard, Send, Volume2, VolumeX } from "lucide-react";
import { useCommandStore } from "@/store/useCommandStore";

interface ChatTurn {
  role: "user" | "ceo";
  text: string;
  note?: string;
}

export function CeoConsole({
  embedded = false,
  dashboardContext,
}: {
  embedded?: boolean;
  dashboardContext?: unknown;
}) {
  const router = useRouter();
  const [typing, setTyping] = useState(false);
  const [provider, setProvider] = useState("");
  const logEnd = useRef<HTMLDivElement>(null);
  const view = useCommandStore((s) => s.view);
  const dataMode = useCommandStore((s) => s.dataMode);
  const voiceMuted = useCommandStore((s) => s.voiceMuted);
  const setVoiceMuted = useCommandStore((s) => s.setVoiceMuted);
  const store = useCommandStore;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [hud, setHud] = useState<string | null>(null);
  const ceoReports = useCommandStore((s) => s.ceoReports);
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
    if (open && !embedded) inputRef.current?.focus();
  }, [open, embedded]);

  useEffect(() => {
    if (ceoReports.length === 0) return;
    setTurns((prev) => {
      const seen = new Set(
        prev.filter((turn) => turn.role === "ceo").map((turn) => turn.text),
      );
      const incoming = ceoReports.filter((report) => !seen.has(report.text));
      if (incoming.length === 0) return prev;
      return [
        ...prev,
        ...incoming.map((report) => ({
          role: "ceo" as const,
          text: report.text,
        })),
      ];
    });
    setOpen(true);
  }, [ceoReports]);

  const clearVoiceHint = clearHint;
  useEffect(() => {
    if (!voice.hint && !hud) return;
    const id = window.setTimeout(() => {
      clearVoiceHint();
      setHud(null);
    }, 5200);
    return () => window.clearTimeout(id);
  }, [clearVoiceHint, voice.hint, hud]);

  const runIntents = useCallback(
    (text: string): string | undefined => {
      const intents = parseIntents(text);
      const s = store.getState();
      for (const intent of intents) {
        if (intent.type === "enter") {
          if (embedded)
            router.push(`/projects/${encodeURIComponent(intent.slug)}`);
          else s.enterProject(intent.slug);
        }
        if (intent.type === "universe") s.returnToUniverse();
        if (intent.type === "mode") s.setMode(intent.mode);
        if (intent.type === "problems") {
          const slug =
            Object.entries(s.projects).find(
              ([, p]) => p.status === "attention",
            )?.[0] ?? "rawixis";
          s.enterProject(slug);
        }
      }
      const last = intents.at(-1);
      if (last?.type === "enter") return `Navigated to ${last.slug}`;
      if (last?.type === "problems") return "Opened the attention project";
      return undefined;
    },
    [store, embedded, router],
  );

  const ask = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || busyRef.current) return;
      busyRef.current = true;
      if (!voiceMutedRef.current) prime();
      setOpen(true);
      setInput("");
      setTurns((prev) => [...prev, { role: "user", text: message }]);
      const note = runIntents(message);
      setBusy(true);
      try {
        const snapshot = store.getState();
        const history = [
          ...turnsRef.current,
          { role: "user" as const, text: message },
        ].map((t) => ({
          role: t.role === "ceo" ? ("assistant" as const) : ("user" as const),
          content: t.text,
        }));
        const res = await fetch("/api/ceo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            context: {
              dataMode: embedded ? "live" : snapshot.dataMode,
              projects: embedded ? {} : snapshot.projects,
              agents: embedded ? {} : snapshot.agents,
              events: embedded ? { buffer: [], unread: 0 } : snapshot.events,
              headquarters: embedded ? dashboardContext : undefined,
              approvals: snapshot.approvals,
            },
          }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          text?: string;
          provider?: string;
          error?: string;
          approval?: {
            title: string;
            description: string;
            kind: "deploy" | "campaign" | "financial" | "other";
            risk: "low" | "medium" | "high";
          };
          actions?: CeoClientAction[];
        };
        if (body.provider) setProvider(body.provider);
        if (embedded)
          for (const action of body.actions ?? []) {
            if (action.name === "navigate" && action.project)
              router.push(`/projects/${encodeURIComponent(action.project)}`);
            if (action.name === "navigate" && action.agent)
              router.push(
                `/business-world?agent=${encodeURIComponent(action.agent)}`,
              );
          }
        const actionNotes = applyCeoClientActions(body.actions ?? [], store);
        const reply =
          (body.text ?? "").trim() || body.error || HUD_COPY.noReply;
        if (
          body.approval &&
          !(body.actions ?? []).some(
            (action) => action.name === "propose_approval",
          )
        ) {
          snapshot.requestApproval(body.approval);
        }
        const combinedNote =
          [note, ...actionNotes].filter(Boolean).join(" · ") || undefined;
        setTurns((prev) => [
          ...prev,
          { role: "ceo", text: reply, note: combinedNote },
        ]);
        if (!voiceMutedRef.current && reply) speak(reply);
      } catch {
        const fallback = HUD_COPY.unreachable;
        setTurns((prev) => [...prev, { role: "ceo", text: fallback }]);
        setHud(fallback);
      } finally {
        setBusy(false);
        busyRef.current = false;
      }
    },
    [prime, runIntents, speak, store, embedded, dashboardContext, router],
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
  }, [
    ask,
    start,
    stop,
    voice.listening,
    voice.supported,
    voice.unsupportedHint,
  ]);

  useEffect(() => {
    if (embedded && turns.length)
      logEnd.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [turns.length, embedded]);

  if (view === "boot" && !embedded) return null;

  const displayValue = voice.listening ? voice.interim : input;
  const banner = voice.hint ?? hud;

  if (embedded)
    return (
      <section
        className={`hq-cixy-console ${voice.listening ? "is-listening" : ""} ${busy ? "is-thinking" : ""}`}
        aria-label="Cixy voice headquarters"
      >
        <div className="hq-cixy-art">
          <Image
            src="/headquarters/cixy.png"
            alt="Cixy, your executive assistant, at her vintage office desk"
            fill
            priority
            sizes="(max-width: 760px) 100vw, 45vw"
          />
          <div>
            <h2>CIXY</h2>
            <p>What would you like to work on, Awad?</p>
          </div>
        </div>
        <div className="hq-cixy-controls">
          <div className="hq-wave" aria-hidden="true">
            {Array.from({ length: 48 }, (_, i) => (
              <i
                key={i}
                style={{
                  height: `${8 + ((i * 13) % 29)}px`,
                  animationDelay: `${i * -0.07}s`,
                }}
              />
            ))}
          </div>
          <div className="hq-talk-row">
            <button
              className="hq-talk"
              onClick={toggleMic}
              disabled={busy}
              aria-pressed={voice.listening}
            >
              {voice.listening ? <MicOff size={22} /> : <Mic size={22} />}{" "}
              {voice.listening
                ? "STOP LISTENING"
                : busy
                  ? "CIXY IS THINKING"
                  : "TAP TO TALK"}
            </button>
            <button
              onClick={() => {
                setTyping(true);
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
            >
              <Keyboard size={18} /> TYPE A MESSAGE
            </button>
            <button
              aria-label={
                voiceMuted ? "Enable spoken replies" : "Mute spoken replies"
              }
              onClick={() => {
                if (!voiceMuted) voice.stopSpeaking();
                setVoiceMuted(!voiceMuted);
              }}
            >
              {voiceMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
          <p className="hq-voice-status" role="status">
            {banner ??
              (voice.listening
                ? voice.interim || "Listening… speak naturally."
                : busy
                  ? "Working through your request…"
                  : "Microphone off · Tap to begin")}
            {provider && ` · ${provider}`}
          </p>
          <div className="hq-cixy-shortcuts">
            {[
              [
                "Brief me",
                "Give me a concise headquarters briefing using verified live information. Do not take any actions.",
              ],
              [
                "Plan my day",
                "Help me prioritize my tasks and agenda. Recommend a plan without executing actions.",
              ],
              [
                "Review finances",
                "Summarize the verified financial data and what is missing. Do not perform financial actions.",
              ],
            ].map(([label, prompt]) => (
              <button
                key={label}
                disabled={busy}
                onClick={() => void ask(prompt)}
              >
                {label}
              </button>
            ))}
          </div>
          {(typing || turns.length > 0 || busy) && (
            <div className="hq-conversation">
              <div
                className="hq-conversation-log"
                role="log"
                aria-label="Conversation with Cixy"
              >
                {turns.map((turn, i) => (
                  <div className={`hq-chat-turn ${turn.role}`} key={i}>
                    <strong>{turn.role === "user" ? "YOU" : "CIXY"}</strong>
                    <p>{turn.text}</p>
                    {turn.note && <small>{turn.note}</small>}
                  </div>
                ))}
                {busy && <p className="hq-thinking">Cixy is responding…</p>}
                <div ref={logEnd} />
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void ask(input);
                }}
              >
                <input
                  ref={inputRef}
                  aria-label="Message Cixy"
                  placeholder="Ask Cixy anything…"
                  value={displayValue}
                  readOnly={voice.listening}
                  onChange={(e) => setInput(e.target.value)}
                  maxLength={4000}
                />
                <button
                  disabled={busy || !input.trim()}
                  aria-label="Send to Cixy"
                >
                  <Send size={17} />
                </button>
              </form>
            </div>
          )}
        </div>
      </section>
    );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pointer-events-auto fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full border border-[var(--line)] bg-[rgba(23,26,31,0.45)] px-3 py-1.5 text-[11px] tracking-[0.16em] text-[var(--muted)]"
        aria-label={HUD_COPY.askAriaLabel}
      >
        <span className="dot" style={{ marginRight: 0 }} />
        {HUD_COPY.collapsedLabel}
      </button>
    );
  }

  return (
    <div className="pointer-events-auto fixed bottom-4 right-4 z-30 w-[min(360px,calc(100%-32px))]">
      <Glass className="mb-2 max-h-[46vh] overflow-auto p-3">
        <div className="mb-2 flex items-center justify-between text-[10px] tracking-[0.14em] text-[var(--muted)]">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span>
              {HUD_COPY.consoleTitle}{" "}
              {dataMode === "demo" ? <span className="tag">DEMO</span> : null}
            </span>
            <span className="text-[8px] tracking-[0.12em] text-[rgba(138,144,154,0.85)]">
              {HUD_COPY.poweredBy}
            </span>
          </span>
          <button type="button" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
        <div className="space-y-2 text-[13px]">
          {turns.length === 0 && !busy ? (
            <div className="text-[var(--muted)]">{HUD_COPY.emptyState}</div>
          ) : null}
          {turns.map((turn, i) => (
            <div
              key={i}
              className={
                turn.role === "user"
                  ? "text-[var(--muted)]"
                  : "text-[var(--text)]"
              }
            >
              {turn.text}
              {turn.note ? (
                <div className="mt-1 text-[10px] text-[var(--accent)]">
                  {turn.note}
                </div>
              ) : null}
            </div>
          ))}
          {busy ? (
            <div className="text-[var(--muted)]">{HUD_COPY.thinking}</div>
          ) : null}
        </div>
      </Glass>
      {banner ? (
        <div
          className="mb-2 text-right text-[11px] text-[var(--muted)]"
          role="status"
        >
          {banner}
        </div>
      ) : null}
      <Glass
        className={`flex items-center gap-2 px-3 py-2 text-[12px] text-[var(--muted)] ${
          voice.listening ? "mic-listening-bar" : ""
        }`}
      >
        <span
          className={`dot ${voice.listening ? "mic-listening-dot" : ""}`}
          style={{
            background: "var(--accent)",
            boxShadow: "0 0 10px var(--accent)",
            marginRight: 0,
          }}
        />
        <input
          ref={inputRef}
          data-awad-ceo-input
          value={displayValue}
          readOnly={voice.listening}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void ask(input);
          }}
          placeholder={voice.listening ? "Listening…" : HUD_COPY.askPlaceholder}
          className={`w-full bg-transparent text-[var(--text)] outline-none placeholder:text-[var(--muted)] ${
            voice.listening ? "italic text-[var(--accent)]" : ""
          }`}
          aria-label={HUD_COPY.askAriaLabel}
        />
        <button
          type="button"
          aria-label={
            voiceMuted ? "Unmute spoken replies" : "Mute spoken replies"
          }
          title={voiceMuted ? "Spoken replies off" : "Spoken replies on"}
          onClick={() => setVoiceMuted(!voiceMuted)}
          className="grid h-[24px] w-[24px] place-items-center rounded-full border border-[var(--line)] text-[11px] text-[var(--muted)]"
        >
          {voiceMuted ? "🔇" : "🔊"}
        </button>
        <button
          type="button"
          aria-label={voice.listening ? "Stop listening" : "Start listening"}
          aria-pressed={voice.listening}
          title={
            voice.supported
              ? voice.listening
                ? "Stop"
                : "Speak"
              : voice.unsupportedHint
          }
          onClick={toggleMic}
          className={`grid h-[24px] w-[24px] place-items-center rounded-full border text-xs ${
            voice.listening
              ? "mic-listening border-[var(--accent)] text-[var(--accent)]"
              : "border-[var(--line)]"
          }`}
        >
          {voice.listening ? "●" : "🎙"}
        </button>
      </Glass>
    </div>
  );
}

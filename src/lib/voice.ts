"use client";

import { preferredBritishVoice } from "./cixyCharacter";
import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onstart: (() => void) | null;
};

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: { isFinal: boolean; 0: { transcript: string } };
  };
}

const UNSUPPORTED_HINT = "Voice input needs Chrome or Safari. Type instead.";
const BLOCKED_HINT = "Mic permission denied. Type your question instead.";
const FAILED_HINT = "Mic could not start. Type instead.";

function recognitionCtor(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  try {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRec;
      webkitSpeechRecognition?: new () => SpeechRec;
    };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
  } catch {
    return null;
  }
}

function createRecognition(): SpeechRec | null {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;
  try {
    return new Ctor();
  } catch {
    return null;
  }
}

function unlockSpeech() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.resume();
  } catch {
    /* ignore */
  }
}

export function useVoice() {
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState("");
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const recRef = useRef<SpeechRec | null>(null);
  const finalRef = useRef<(text: string) => void>(() => undefined);

  useEffect(() => {
    setSupported(Boolean(recognitionCtor()));
    try {
      setVoiceName(localStorage.getItem("cixy-voice-name") ?? "");
    } catch {}
    try {
      setVoices(window.speechSynthesis?.getVoices() ?? []);
    } catch {}
    const onVoices = () => {
      try {
        setVoices(window.speechSynthesis?.getVoices() ?? []);
      } catch {}
    };
    window.speechSynthesis?.addEventListener?.("voiceschanged", onVoices);
    return () => {
      window.speechSynthesis?.removeEventListener?.("voiceschanged", onVoices);
      try {
        if (recRef.current?.abort) recRef.current.abort();
        else recRef.current?.stop();
      } catch {}
      try {
        window.speechSynthesis?.cancel();
      } catch {}
      audioRef.current?.pause();
    };
  }, []);

  const stopSpeaking = useCallback(() => {
    setSpeaking(false);
    utterRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    try {
      window.speechSynthesis?.cancel();
    } catch {}
  }, []);

  const speakDevice = useCallback(
    (cleaned: string) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(cleaned);
        utter.lang = "en-GB";
        utter.rate = 0.92;
        utter.pitch = 0.98;
        const available = window.speechSynthesis.getVoices();
        const voice =
          available.find((v) => v.name === voiceName) ??
          preferredBritishVoice(available);
        if (voice) utter.voice = voice;
        utterRef.current = utter;
        utter.onstart = () => {
          if (utterRef.current === utter) setSpeaking(true);
        };
        utter.onend = () => {
          if (utterRef.current === utter) {
            setSpeaking(false);
            utterRef.current = null;
          }
        };
        utter.onerror = () => {
          if (utterRef.current === utter) setSpeaking(false);
        };
        window.speechSynthesis.speak(utter);
      } catch {
        setSpeaking(false);
      }
    },
    [voiceName],
  );

  const speak = useCallback(
    (text: string) => {
      const cleaned = text.replace(/\s+/g, " ").trim();
      if (!cleaned) return;
      stopSpeaking();
      void (async () => {
        try {
          const res = await fetch("/api/cixy-speak", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: cleaned }),
          });
          const type = res.headers.get("content-type") ?? "";
          if (res.ok && type.includes("audio")) {
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audioRef.current = audio;
            audio.onplay = () => setSpeaking(true);
            audio.onended = () => {
              setSpeaking(false);
              URL.revokeObjectURL(url);
            };
            audio.onerror = () => {
              setSpeaking(false);
              speakDevice(cleaned);
            };
            await audio.play();
            return;
          }
        } catch {
          /* fall through */
        }
        speakDevice(cleaned);
      })();
    },
    [speakDevice, stopSpeaking],
  );

  const stop = useCallback(() => {
    setListening(false);
    setInterim("");
    try {
      recRef.current?.stop();
    } catch {}
  }, []);

  const start = useCallback(
    (onFinal: (text: string) => void) => {
      stopSpeaking();
      unlockSpeech();
      const rec = recRef.current ?? createRecognition();
      recRef.current = rec;
      if (!rec) {
        setHint(UNSUPPORTED_HINT);
        return false;
      }
      finalRef.current = onFinal;
      rec.lang = "en-US";
      rec.continuous = false;
      rec.interimResults = true;
      rec.onstart = () => {
        setListening(true);
        setHint(null);
      };
      rec.onresult = (event) => {
        let next = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const piece = event.results[i]?.[0]?.transcript ?? "";
          if (event.results[i].isFinal) {
            const cleaned = piece.replace(/^(?:Cixy|CEO),?\s*/i, "").trim();
            setInterim("");
            if (cleaned) finalRef.current(cleaned);
          } else {
            next += piece;
          }
        }
        if (next) setInterim(next);
      };
      rec.onerror = (event) => {
        setListening(false);
        setInterim("");
        const code = event.error ?? "";
        if (code === "aborted") return;
        if (code === "not-allowed" || code === "service-not-allowed") {
          setHint(BLOCKED_HINT);
          return;
        }
        if (code === "no-speech") {
          setHint("No speech heard. Tap the mic and try again.");
          return;
        }
        setHint(FAILED_HINT);
      };
      rec.onend = () => {
        setListening(false);
      };
      try {
        rec.start();
        setListening(true);
        setInterim("");
        setHint(null);
        return true;
      } catch {
        setListening(false);
        setHint(FAILED_HINT);
        return false;
      }
    },
    [stopSpeaking],
  );

  const clearHint = useCallback(() => setHint(null), []);
  const prime = useCallback(() => {
    unlockSpeech();
  }, []);
  const chooseVoice = useCallback((name: string) => {
    setVoiceName(name);
    try {
      localStorage.setItem("cixy-voice-name", name);
    } catch {}
  }, []);
  const selectedVoice =
    voices.find((v) => v.name === voiceName) ?? preferredBritishVoice(voices);
  return {
    speaking,
    voices: voices.filter((v) => /^en[-_]GB$/i.test(v.lang)),
    selectedVoice,
    chooseVoice,
    supported,
    listening,
    interim,
    hint,
    start,
    stop,
    speak,
    stopSpeaking,
    prime,
    clearHint,
    unsupportedHint: UNSUPPORTED_HINT,
  };
}

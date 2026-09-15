'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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
  results: { length: number; [index: number]: { isFinal: boolean; 0: { transcript: string } } };
}

const UNSUPPORTED_HINT = 'Voice input needs Chrome or Safari. Type instead.';
const BLOCKED_HINT = 'Mic permission denied. Type your question instead.';
const FAILED_HINT = 'Mic could not start. Type instead.';

function recognitionCtor(): (new () => SpeechRec) | null {
  if (typeof window === 'undefined') return null;
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

function pickVoice(): SpeechSynthesisVoice | undefined {
  if (typeof window === 'undefined' || !window.speechSynthesis) return undefined;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === 'en-US' && /samantha|google us|jenny|aria|natural/i.test(v.name)) ??
    voices.find((v) => v.lang === 'en-US') ??
    voices.find((v) => v.lang.startsWith('en'))
  );
}

function unlockSpeech() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.resume();
    const warm = new SpeechSynthesisUtterance(' ');
    warm.volume = 0;
    warm.rate = 1;
    window.speechSynthesis.speak(warm);
    window.speechSynthesis.cancel();
  } catch {
    /* Safari / Chrome may reject warmup — never crash the shell */
  }
}

export function useVoice() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const recRef = useRef<SpeechRec | null>(null);
  const finalRef = useRef<(text: string) => void>(() => undefined);

  useEffect(() => {
    setSupported(Boolean(recognitionCtor()));
    try {
      window.speechSynthesis?.getVoices();
    } catch {
      /* ignore */
    }
    const onVoices = () => {
      try {
        window.speechSynthesis?.getVoices();
      } catch {
        /* ignore */
      }
    };
    window.speechSynthesis?.addEventListener?.('voiceschanged', onVoices);
    return () => {
      window.speechSynthesis?.removeEventListener?.('voiceschanged', onVoices);
      try {
        if (recRef.current?.abort) recRef.current.abort();
        else recRef.current?.stop();
      } catch {
        /* ignore */
      }
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (!cleaned) return;
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
      const utter = new SpeechSynthesisUtterance(cleaned);
      utter.rate = 1;
      utter.lang = 'en-US';
      const voice = pickVoice();
      if (voice) utter.voice = voice;
      window.speechSynthesis.speak(utter);
    } catch {
      /* never crash the shell */
    }
  }, []);

  const stop = useCallback(() => {
    setListening(false);
    setInterim('');
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
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
      rec.lang = 'en-US';
      rec.continuous = false;
      rec.interimResults = true;
      rec.onstart = () => {
        setListening(true);
        setHint(null);
      };
      rec.onresult = (event) => {
        let next = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const piece = event.results[i]?.[0]?.transcript ?? '';
          if (event.results[i].isFinal) {
            const cleaned = piece.replace(/^(?:Cixy|CEO),?\s*/i, '').trim();
            setInterim('');
            if (cleaned) finalRef.current(cleaned);
          } else {
            next += piece;
          }
        }
        if (next) setInterim(next);
      };
      rec.onerror = (event) => {
        setListening(false);
        setInterim('');
        const code = event.error ?? '';
        if (code === 'aborted') return;
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          setHint(BLOCKED_HINT);
          return;
        }
        if (code === 'no-speech') {
          setHint('No speech heard. Tap the mic and try again.');
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
        setInterim('');
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

  return {
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

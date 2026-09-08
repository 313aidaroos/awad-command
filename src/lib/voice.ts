'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
};

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: { isFinal: boolean; 0: { transcript: string } } };
}

function getRecognition(): SpeechRec | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    (window as unknown as { SpeechRecognition?: new () => SpeechRec }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function useVoice() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const recRef = useRef<SpeechRec | null>(null);
  const finalRef = useRef<(text: string) => void>(() => undefined);

  useEffect(() => {
    const rec = getRecognition();
    recRef.current = rec;
    setSupported(Boolean(rec));
  }, []);

  const start = useCallback((onFinal: (text: string) => void) => {
    const rec = recRef.current;
    if (!rec) return;
    finalRef.current = onFinal;
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (event) => {
      let next = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          const cleaned = piece.replace(/^CEO,?\s*/i, '').trim();
          finalRef.current(cleaned);
          setInterim('');
        } else {
          next += piece;
        }
      }
      if (next) setInterim(next);
    };
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.speechSynthesis?.cancel();
  }, []);

  return { supported, listening, interim, start, stop, speak, stopSpeaking };
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Captions, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import type { DailyEpisode } from '@/daily-host/types';

const sceneNames = ['History', 'Word', 'Quote', 'Closing'] as const;

export function DailyHostPreview({ episode }: { episode?: DailyEpisode }) {
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [captions, setCaptions] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setScene((current) => {
        if (current >= sceneNames.length - 1) {
          setPlaying(false);
          return 0;
        }
        return current + 1;
      });
    }, 5200);
    return () => window.clearInterval(timer);
  }, [playing]);

  const content = useMemo(() => {
    if (!episode) return { title: 'READY WHEN YOU ARE', body: 'Generate today’s episode to begin.', caption: 'Daily AI Host' };
    if (scene === 0) return {
      eyebrow: 'ON THIS DAY IN HISTORY',
      title: String(episode.historicalEvent.year),
      body: episode.historicalEvent.title,
      caption: episode.script.historySegment,
    };
    if (scene === 1) return {
      eyebrow: 'WORD OF THE DAY',
      title: episode.word.word,
      body: `${episode.word.pronunciation} · ${episode.word.partOfSpeech}\n${episode.word.definition}`,
      caption: episode.script.wordSegment,
    };
    if (scene === 2) return {
      eyebrow: 'QUOTE OF THE DAY',
      title: `“${episode.quote.quote}”`,
      body: `— ${episode.quote.author}`,
      caption: episode.script.quoteSegment,
    };
    return {
      eyebrow: 'DAILY AI HOST',
      title: 'SEE YOU TOMORROW',
      body: episode.episodeDate,
      caption: episode.script.closing,
    };
  }, [episode, scene]);

  function speak() {
    if (!episode || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(episode.script.fullScript);
    utterance.rate = 1;
    utterance.volume = muted ? 0 : 1;
    window.speechSynthesis.speak(utterance);
    setPlaying(true);
  }

  return (
    <section aria-label="Demo video preview" className="flex min-w-0 flex-col items-center gap-3">
      <div className="relative aspect-[9/16] max-h-[66vh] w-full max-w-[330px] overflow-hidden rounded-[28px] border border-white/15 bg-[#090b12] shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_20%,rgba(61,139,255,.38),transparent_35%),linear-gradient(155deg,#111827,#07080a_65%)]" />
        <div className="absolute inset-x-5 top-5 flex items-center justify-between text-[9px] tracking-[.2em] text-white/65">
          <span>AWAD COMMAND</span><span className="rounded border border-white/15 px-1.5 py-0.5">DEMO PREVIEW</span>
        </div>
        <div className="absolute inset-x-7 top-[22%] text-center">
          <p className="mb-4 text-[10px] tracking-[.28em] text-[#78aaff]">{content.eyebrow}</p>
          <h3 className={`font-light leading-tight text-white ${scene === 2 ? 'text-xl' : 'text-4xl'}`}>{content.title}</h3>
          <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-white/72">{content.body}</p>
        </div>
        <div className="absolute bottom-5 inset-x-4">
          {captions ? <p className="mb-4 rounded-lg bg-black/65 px-3 py-2 text-center text-[11px] leading-relaxed text-white">{content.caption}</p> : null}
          <div className="flex gap-1">
            {sceneNames.map((name, index) => (
              <button
                key={name}
                type="button"
                aria-label={`Show ${name} scene`}
                onClick={() => setScene(index)}
                className={`h-1 flex-1 rounded-full ${index <= scene ? 'bg-[#3d8bff]' : 'bg-white/20'}`}
              />
            ))}
          </div>
          <p className="mt-2 text-center text-[9px] tracking-[.18em] text-white/45">{sceneNames[scene]}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 rounded-full border border-[var(--line)] bg-black/30 p-1">
        <Control label="Previous section" onClick={() => setScene((value) => Math.max(0, value - 1))}><ChevronLeft /></Control>
        <Control label={playing ? 'Pause' : 'Play'} onClick={() => { if (!playing) speak(); else { window.speechSynthesis?.pause(); setPlaying(false); } }}>{playing ? <Pause /> : <Play />}</Control>
        <Control label="Next section" onClick={() => setScene((value) => Math.min(3, value + 1))}><ChevronRight /></Control>
        <Control label="Restart" onClick={() => { setScene(0); window.speechSynthesis?.cancel(); setPlaying(false); }}><RotateCcw /></Control>
        <Control label={muted ? 'Unmute' : 'Mute'} active={muted} onClick={() => { setMuted((value) => !value); window.speechSynthesis?.cancel(); }}>{muted ? <VolumeX /> : <Volume2 />}</Control>
        <Control label="Toggle captions" active={captions} onClick={() => setCaptions((value) => !value)}><Captions /></Control>
      </div>
    </section>
  );
}

function Control({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={`rounded-full p-2 ${active ? 'bg-[#3d8bff]/25 text-white' : 'text-[var(--muted)] hover:text-white'} [&_svg]:size-3.5`}>
      {children}
    </button>
  );
}

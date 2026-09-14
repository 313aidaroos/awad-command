'use client';

import { useEffect, useState } from 'react';
import { Check, Circle, LoaderCircle, Search, TriangleAlert } from 'lucide-react';
import type { AutomationRun, DailyEpisode, SocialPlatform, SocialPost } from '@/daily-host/types';
import { Glass } from '@/ui/Glass';
import { Metric } from '@/ui/Metric';
import { DailyHostPreview } from '@/ui/daily-host/DailyHostPreview';

export function TodayView({
  episode,
  busy,
  onAction,
}: {
  episode?: DailyEpisode;
  busy: string | null;
  onAction: (action: string, body?: Record<string, unknown>) => Promise<void>;
}) {
  const [script, setScript] = useState(episode?.script.fullScript ?? '');
  useEffect(() => setScript(episode?.script.fullScript ?? ''), [episode]);

  if (!episode) {
    return (
      <Glass className="grid min-h-[55vh] place-items-center p-8 text-center">
        <div><p className="text-xs tracking-[.24em] text-[#78aaff]">TODAY’S EPISODE</p><h2 className="mt-4 text-2xl font-light">Your daily story is ready to be created.</h2><p className="mx-auto mt-3 max-w-lg text-sm text-[var(--muted)]">Curated facts, a fresh word, a verified quote, and a complete script—saved persistently.</p><button className="primary mt-6" disabled={Boolean(busy)} onClick={() => onAction('generate')}>Generate today’s episode</button></div>
      </Glass>
    );
  }

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-3">
        <Glass className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-[10px] tracking-[.2em] text-[#78aaff]">TODAY’S EPISODE · V{episode.version}</p><h2 className="mt-2 text-xl font-light">{episode.historicalEvent.title}</h2><p className="mt-1 text-xs text-[var(--muted)]">{episode.episodeDate} · {episode.historicalEvent.year} · {episode.historicalEvent.category}</p></div>
            <Status value={episode.status.replaceAll('_', ' ')} tone={episode.status === 'failed' ? 'error' : 'active'} />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Fact label="Historical event" value={episode.historicalEvent.summary} />
            <Fact label="Word" value={`${episode.word.word} · ${episode.word.definition}`} />
            <Fact label="Quote" value={`“${episode.quote.quote}” — ${episode.quote.author}`} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="primary" disabled={Boolean(busy)} onClick={() => onAction('generate_video', { id: episode.id })}>Generate demo video</button>
            <button className="secondary" disabled={Boolean(busy)} onClick={() => onAction('approve', { id: episode.id })}>{episode.approved ? 'Approved' : 'Approve'}</button>
            <button className="secondary" disabled={Boolean(busy)} onClick={() => onAction('qc', { id: episode.id })}>Run QC</button>
            <button className="secondary" disabled={Boolean(busy)} onClick={() => onAction('generate', { alternate: true })}>Generate alternate</button>
          </div>
        </Glass>

        <Glass className="p-4">
          <h3 className="text-xs tracking-[.16em]">PIPELINE</h3>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {episode.pipeline.map((step) => <PipelineStepView key={step.key} label={step.label} status={step.status} />)}
          </div>
        </Glass>

        <Glass className="p-4">
          <div className="flex items-center justify-between gap-3"><div><h3 className="text-xs tracking-[.16em]">SCRIPT</h3><p className="mt-1 text-[10px] text-[var(--muted)]">Version {episode.scriptVersion} · about {episode.script.estimatedDurationSeconds} seconds</p></div><Status value={episode.qcStatus} tone={episode.qcStatus === 'fail' ? 'error' : episode.qcStatus === 'warning' ? 'warning' : 'active'} /></div>
          <textarea aria-label="Episode script" className="mt-3 min-h-52 w-full resize-y rounded-xl border border-[var(--line)] bg-black/25 p-3 text-sm leading-relaxed text-[var(--text)]" value={script} onChange={(event) => setScript(event.target.value)} />
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="primary" disabled={Boolean(busy)} onClick={() => onAction('save_script', { id: episode.id, script })}>Save script</button>
            <button className="secondary" disabled={Boolean(busy)} onClick={() => onAction('regenerate_script', { id: episode.id })}>Regenerate</button>
            <button className="secondary" onClick={() => navigator.clipboard.writeText(script)}>Copy</button>
            <button className="secondary" onClick={() => { const voice = new SpeechSynthesisUtterance(script); window.speechSynthesis.cancel(); window.speechSynthesis.speak(voice); }}>Generate voice preview</button>
          </div>
        </Glass>

        <Glass className="p-4">
          <h3 className="text-xs tracking-[.16em]">SOCIAL PLATFORMS</h3>
          <p className="mt-1 text-[10px] text-[var(--muted)]">No real social credentials are connected. Simulation records a post without contacting a platform.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-5">
            {(['youtube', 'tiktok', 'instagram', 'facebook', 'x'] as SocialPlatform[]).map((platform) => (
              <button key={platform} type="button" disabled={!episode.approved || Boolean(busy)} onClick={() => onAction('simulate_publish', { id: episode.id, platform })} className="rounded-xl border border-[var(--line)] p-3 text-left text-xs hover:border-white/20 disabled:opacity-40">
                <span className="block capitalize">{platform}</span><span className="mt-1 block text-[9px] text-[var(--s-attention)]">NOT CONNECTED</span><span className="mt-2 block text-[10px] text-[var(--muted)]">Simulate publish</span>
              </button>
            ))}
          </div>
        </Glass>
      </div>
      <Glass className="h-fit p-4"><DailyHostPreview episode={episode} /></Glass>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[var(--line)] bg-black/15 p-3"><p className="text-[9px] tracking-[.14em] text-[var(--muted)]">{label}</p><p className="mt-2 line-clamp-4 text-xs leading-relaxed">{value}</p></div>;
}

function PipelineStepView({ label, status }: { label: string; status: DailyEpisode['pipeline'][number]['status'] }) {
  const Icon = status === 'completed' ? Check : status === 'running' ? LoaderCircle : status === 'failed' ? TriangleAlert : Circle;
  return <div className="rounded-lg border border-[var(--line)] px-2 py-2 text-center"><Icon className={`mx-auto size-3 ${status === 'completed' ? 'text-[var(--s-active)]' : status === 'failed' ? 'text-[var(--s-error)]' : 'text-[var(--s-idle)]'}`} /><span className="mt-1 block truncate text-[9px] text-[var(--muted)]">{label}</span></div>;
}

export function HistoryView({ episodes, posts }: { episodes: DailyEpisode[]; posts: SocialPost[] }) {
  const [query, setQuery] = useState('');
  const filtered = episodes.filter((episode) => JSON.stringify([episode.episodeDate, episode.historicalEvent.title, episode.historicalEvent.year, episode.word.word, episode.quote.author, episode.status]).toLowerCase().includes(query.toLowerCase()));
  return <Glass className="p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm tracking-[.16em]">EPISODE HISTORY</h2><p className="mt-1 text-[10px] text-[var(--muted)]">Persistent duplicate memory is active.</p></div><label className="flex items-center gap-2 rounded-full border border-[var(--line)] px-3 py-2"><Search className="size-3 text-[var(--muted)]" /><input aria-label="Search episode history" placeholder="Search history" value={query} onChange={(event) => setQuery(event.target.value)} className="w-40 bg-transparent text-xs outline-none" /></label></div><div className="mt-4 space-y-2">{filtered.length ? filtered.map((episode) => <div key={episode.id} className="grid gap-2 rounded-xl border border-[var(--line)] p-3 text-xs md:grid-cols-[110px_1fr_120px_1fr_110px]"><span className="font-num text-[var(--muted)]">{episode.episodeDate} · v{episode.version}</span><span>{episode.historicalEvent.title}</span><span>{episode.word.word}</span><span className="truncate">{episode.quote.author}</span><span className="text-[var(--muted)]">{episode.status.replaceAll('_', ' ')}{posts.some((post) => post.episodeId === episode.id) ? ' · simulated' : ''}</span></div>) : <p className="py-12 text-center text-sm text-[var(--muted)]">No matching episodes.</p>}</div></Glass>;
}

export function AnalyticsView({ episodes, posts }: { episodes: DailyEpisode[]; posts: SocialPost[] }) {
  const published = episodes.filter((episode) => episode.status === 'published').length;
  const metrics = [['Episodes generated', episodes.length], ['Episodes published', published], ['Simulated posts', posts.length], ['Total views', 0], ['Total likes', 0], ['Total comments', 0], ['Total shares', 0], ['Completion rate', '0%']];
  return <div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(([label, value]) => <Glass key={label} className="p-4"><p className="text-[10px] tracking-[.12em] text-[var(--muted)]">{label}</p><p className="mt-3 text-2xl"><Metric value={String(value)} /></p></Glass>)}</div><Glass className="mt-3 p-6 text-center"><span className="tag">ZERO STATE</span><p className="mt-3 text-sm text-[var(--muted)]">Live retention, platform, category, timing, and follower insights appear after real social accounts are connected.</p></Glass></div>;
}

export function LogsView({ runs }: { runs: AutomationRun[] }) {
  return <Glass className="p-4"><h2 className="text-sm tracking-[.16em]">AUTOMATION LOGS</h2><div className="mt-4 space-y-2">{runs.length ? runs.map((run) => <details key={run.id} className="rounded-xl border border-[var(--line)] p-3 text-xs"><summary className="cursor-pointer"><span className="font-num text-[var(--muted)]">{run.startedAt}</span> · {run.triggerSource} · {run.status}</summary><pre className="mt-3 overflow-auto whitespace-pre-wrap text-[10px] text-[var(--muted)]">{JSON.stringify(run, null, 2)}</pre></details>) : <p className="py-12 text-center text-sm text-[var(--muted)]">No automation runs yet. Manual episode generation remains visible in History.</p>}</div></Glass>;
}

export function Status({ value, tone = 'idle' }: { value: string; tone?: 'active' | 'warning' | 'error' | 'idle' }) {
  const colors = { active: 'var(--s-active)', warning: 'var(--s-attention)', error: 'var(--s-error)', idle: 'var(--s-idle)' };
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] px-2 py-1 text-[9px] uppercase tracking-[.12em]" style={{ color: colors[tone] }}><i className="size-1.5 rounded-full bg-current" />{value}</span>;
}

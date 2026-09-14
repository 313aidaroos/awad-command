'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, PauseCircle, PlayCircle, RefreshCw, X } from 'lucide-react';
import type { DailyHostSettings, DailyHostSnapshot, ProviderState } from '@/daily-host/types';
import { useCommandStore } from '@/store/useCommandStore';
import { Glass } from '@/ui/Glass';
import { DailyHostSettings as SettingsView } from '@/ui/daily-host/DailyHostSettings';
import { AnalyticsView, HistoryView, LogsView, Status, TodayView } from '@/ui/daily-host/DailyHostViews';

type Tab = 'today' | 'history' | 'settings' | 'analytics' | 'logs';
type Snapshot = DailyHostSnapshot & { providers: Record<string, ProviderState> };
const tabs: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'history', label: 'History' },
  { id: 'settings', label: 'Settings' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'logs', label: 'Logs' },
];

export function DailyHostPanel() {
  const focused = useCommandStore((state) => state.focusedProject === 'daily-host');
  const returnToUniverse = useCommandStore((state) => state.returnToUniverse);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [tab, setTab] = useState<Tab>('today');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const load = useCallback(async () => {
    const response = await fetch('/api/daily-host', { cache: 'no-store' });
    const data = await response.json() as Snapshot & { error?: string };
    if (!response.ok) throw new Error(data.error ?? 'Unable to load Daily Host.');
    setSnapshot(data);
  }, []);

  useEffect(() => {
    if (!focused) return;
    void load().catch((error: unknown) => setMessage({ text: error instanceof Error ? error.message : 'Unable to load Daily Host.', error: true }));
  }, [focused, load]);

  async function action(actionName: string, body: Record<string, unknown> = {}) {
    setBusy(actionName);
    setMessage(null);
    try {
      const response = await fetch('/api/daily-host', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: actionName, ...body }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'The action could not be completed.');
      await load();
      setMessage({ text: successMessage(actionName), error: false });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'The action could not be completed.', error: true });
    } finally {
      setBusy(null);
    }
  }

  async function updateSettings(settings: DailyHostSettings) {
    await action('save_settings', { settings });
  }

  if (!focused) return null;

  return (
    <div className="pointer-events-auto fixed inset-x-2 bottom-2 top-12 z-30 overflow-hidden rounded-[18px] border border-[var(--line)] bg-[rgba(7,8,10,.92)] shadow-2xl backdrop-blur-2xl md:inset-x-4">
      <div className="flex h-full flex-col">
        <header className="border-b border-[var(--line)] px-3 py-3 md:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" aria-label="Return to universe" onClick={returnToUniverse} className="rounded-full border border-[var(--line)] p-2 text-[var(--muted)] hover:text-white"><X className="size-4" /></button>
              <div><div className="flex items-center gap-2"><h1 className="text-sm tracking-[.2em] md:text-base">DAILY AI HOST</h1><Status value={snapshot ? 'operational' : 'loading'} tone={snapshot ? 'active' : 'idle'} /></div><p className="mt-1 hidden text-[10px] text-[var(--muted)] sm:block">Autonomous short-form media · next run {snapshot?.settings.generationTime ?? '07:00'} {snapshot?.settings.timezone ?? 'America/Chicago'}</p></div>
            </div>
            {snapshot ? <div className="flex items-center gap-2">
              <Status value={snapshot.settings.autonomyMode === 'review' ? 'review before posting' : snapshot.settings.autonomyMode} tone={snapshot.settings.autonomyMode === 'off' ? 'idle' : 'warning'} />
              <button type="button" disabled={Boolean(busy)} onClick={() => updateSettings({ ...snapshot.settings, paused: !snapshot.settings.paused })} className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-[10px] ${snapshot.settings.paused ? 'border-[var(--s-error)] text-[var(--s-error)]' : 'border-[var(--line)] text-[var(--muted)]'}`}>{snapshot.settings.paused ? <PlayCircle className="size-3.5" /> : <PauseCircle className="size-3.5" />}{snapshot.settings.paused ? 'Resume automation' : 'Pause automation'}</button>
            </div> : null}
          </div>
          <div className="mt-3 flex items-center gap-1 overflow-x-auto">
            {tabs.map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] ${tab === item.id ? 'bg-white/10 text-white' : 'text-[var(--muted)]'}`}>{item.label}</button>)}
            <button type="button" disabled={Boolean(busy)} onClick={() => action('run_automation')} className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--line)] px-3 py-1.5 text-[10px] text-[var(--muted)]"><RefreshCw className={`size-3 ${busy === 'run_automation' ? 'animate-spin' : ''}`} />Run automation</button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-3 md:p-5">
          {message ? <div role="status" className={`mb-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${message.error ? 'border-[var(--s-error)]/40 text-[var(--s-error)]' : 'border-[var(--s-active)]/30 text-[var(--s-active)]'}`}>{message.error ? <AlertTriangle className="size-3.5" /> : null}{message.text}</div> : null}
          {!snapshot ? <Glass className="grid min-h-[50vh] place-items-center"><RefreshCw className="size-5 animate-spin text-[var(--muted)]" /></Glass> : <>
            <Connections providers={snapshot.providers} storageMode={snapshot.storageMode} />
            {tab === 'today' ? <TodayView episode={snapshot.episodes[0]} busy={busy} onAction={action} /> : null}
            {tab === 'history' ? <HistoryView episodes={snapshot.episodes} posts={snapshot.posts} /> : null}
            {tab === 'settings' ? <SettingsView key={JSON.stringify(snapshot.settings)} settings={snapshot.settings} saving={busy === 'save_settings'} onSave={updateSettings} /> : null}
            {tab === 'analytics' ? <AnalyticsView episodes={snapshot.episodes} posts={snapshot.posts} /> : null}
            {tab === 'logs' ? <LogsView runs={snapshot.runs} /> : null}
          </>}
        </main>
      </div>
    </div>
  );
}

function Connections({ providers, storageMode }: { providers: Record<string, ProviderState>; storageMode: string }) {
  const labels: Record<string, string> = { database: 'Database', aiWriter: 'AI writer', historicalResearch: 'Research', avatarGenerator: 'Avatar', voiceGenerator: 'Voice', videoComposer: 'Composer', youtube: 'YouTube', tiktok: 'TikTok', instagram: 'Instagram', facebook: 'Facebook', x: 'X' };
  return <Glass className="mb-3 p-3"><div className="flex items-center gap-3 overflow-x-auto"><div className="shrink-0"><p className="text-[9px] tracking-[.16em]">SYSTEM CONNECTIONS</p><p className="mt-1 text-[9px] text-[var(--muted)]">{storageMode === 'local' ? 'Local development persistence' : 'Supabase persistence'}</p></div>{Object.entries(providers).map(([key, state]) => <div key={key} className="shrink-0 border-l border-[var(--line)] pl-3"><p className="text-[10px]">{labels[key] ?? key}</p><p className={`mt-1 text-[8px] tracking-[.1em] ${state === 'connected' ? 'text-[var(--s-active)]' : state === 'demo' ? 'text-[var(--s-attention)]' : 'text-[var(--muted)]'}`}>{state.replace('_', ' ').toUpperCase()}</p></div>)}</div></Glass>;
}

function successMessage(action: string) {
  const messages: Record<string, string> = {
    generate: 'Episode generated and saved.',
    save_script: 'Script saved.',
    regenerate_script: 'Script regenerated.',
    approve: 'Episode approved for demo publishing.',
    generate_video: 'Demo preview pipeline completed. No avatar render was claimed.',
    qc: 'Quality checks completed.',
    simulate_publish: 'Simulated post recorded. No social platform was contacted.',
    save_settings: 'Settings saved.',
    run_automation: 'Automation run completed.',
  };
  return messages[action] ?? 'Done.';
}

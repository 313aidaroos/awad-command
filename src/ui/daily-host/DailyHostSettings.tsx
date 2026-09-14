'use client';

import { useState } from 'react';
import type { DailyHostSettings as Settings } from '@/daily-host/types';
import { Glass } from '@/ui/Glass';

export function DailyHostSettings({
  settings,
  saving,
  onSave,
}: {
  settings: Settings;
  saving: boolean;
  onSave: (settings: Settings) => Promise<void>;
}) {
  const [draft, setDraft] = useState(settings);
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  function testVoice() {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance('Daily AI Host voice preview is ready.');
    utterance.rate = draft.voiceSpeed;
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Glass className="p-4">
        <Heading title="General" detail="Daily timing and content direction" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Generate at"><input type="time" value={draft.generationTime} onChange={(event) => set('generationTime', event.target.value)} /></Field>
          <Field label="Publish at"><input type="time" value={draft.publishingTime} onChange={(event) => set('publishingTime', event.target.value)} /></Field>
          <Field label="Timezone"><input value={draft.timezone} onChange={(event) => set('timezone', event.target.value)} /></Field>
          <Field label="Length"><select value={draft.durationTarget} onChange={(event) => set('durationTarget', Number(event.target.value))}><option value={45}>45 seconds</option><option value={55}>55 seconds</option><option value={60}>60 seconds</option></select></Field>
          <Field label="Tone"><input value={draft.tone} onChange={(event) => set('tone', event.target.value)} /></Field>
          <Field label="Word difficulty"><select value={draft.wordDifficulty} onChange={(event) => set('wordDifficulty', event.target.value as Settings['wordDifficulty'])}><option value="mixed">Mixed</option><option value="accessible">Accessible</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></Field>
        </div>
      </Glass>

      <Glass className="p-4">
        <Heading title="Autonomy & safety" detail="Publishing remains blocked without real media and passing QC" />
        <Field label="Autonomous mode"><select value={draft.autonomyMode} onChange={(event) => set('autonomyMode', event.target.value as Settings['autonomyMode'])}><option value="off">Off</option><option value="review">Review before posting</option><option value="full">Full autonomy</option></select></Field>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Verified sources"><input type="number" min={1} max={5} value={draft.requiredVerifiedSources} onChange={(event) => set('requiredVerifiedSources', Number(event.target.value))} /></Field>
          <Field label="Retry limit"><input type="number" min={0} max={5} value={draft.maxRegenerationAttempts} onChange={(event) => set('maxRegenerationAttempts', Number(event.target.value))} /></Field>
          <Field label="Daily budget (USD)"><input type="number" min={0} max={1000} value={draft.dailyBudgetUsd} onChange={(event) => set('dailyBudgetUsd', Number(event.target.value))} /></Field>
          <label className="mt-5 flex items-center gap-2 text-xs text-[var(--muted)]"><input type="checkbox" checked={draft.autoRegenerateOnQcFailure} onChange={(event) => set('autoRegenerateOnQcFailure', event.target.checked)} /> Retry failed QC</label>
        </div>
      </Glass>

      <Glass className="p-4">
        <Heading title="Avatar profile" detail="No avatar service is connected" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Avatar provider"><select value={draft.avatarProvider} onChange={(event) => set('avatarProvider', event.target.value)}><option value="demo">Demo preview</option><option value="heygen" disabled>HeyGen · not configured</option><option value="higgsfield" disabled>Higgsfield · not configured</option></select></Field>
          <Field label="Avatar ID"><input value={draft.avatarId} placeholder="Not configured" onChange={(event) => set('avatarId', event.target.value)} /></Field>
          <Field label="Reference photo"><input type="file" accept="image/*" disabled /></Field>
          <Field label="Reference video"><input type="file" accept="video/*" disabled /></Field>
        </div>
        <p className="mt-3 text-[10px] text-[var(--s-attention)]">Secure uploads unlock when Supabase Storage is configured. Files are never bundled into source code.</p>
        <button type="button" className="secondary mt-3" onClick={() => alert('DEMO PREVIEW only. No avatar provider is connected.')}>Test avatar</button>
      </Glass>

      <Glass className="p-4">
        <Heading title="Voice profile" detail="Browser speech is the active no-key fallback" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Voice provider"><select value={draft.voiceProvider} onChange={(event) => set('voiceProvider', event.target.value)}><option value="browser">Browser speech</option><option value="elevenlabs" disabled>ElevenLabs · not configured</option></select></Field>
          <Field label="Voice ID"><input value={draft.voiceId} placeholder="Browser default" onChange={(event) => set('voiceId', event.target.value)} /></Field>
          <Field label={`Speed · ${draft.voiceSpeed.toFixed(1)}×`}><input type="range" min={0.5} max={2} step={0.1} value={draft.voiceSpeed} onChange={(event) => set('voiceSpeed', Number(event.target.value))} /></Field>
        </div>
        <button type="button" className="secondary mt-3" onClick={testVoice}>Test voice</button>
      </Glass>

      <div className="lg:col-span-2 flex justify-end">
        <button type="button" className="primary" disabled={saving} onClick={() => onSave(draft)}>{saving ? 'Saving…' : 'Save settings'}</button>
      </div>
    </div>
  );
}

function Heading({ title, detail }: { title: string; detail: string }) {
  return <div className="mb-4"><h3 className="text-sm tracking-[.16em]">{title}</h3><p className="mt-1 text-[11px] text-[var(--muted)]">{detail}</p></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-[10px] tracking-[.1em] text-[var(--muted)]">{label}<span className="daily-host-field mt-1 block">{children}</span></label>;
}

'use client';

import { useEffect, useState } from 'react';
import { haltComputerAction } from '@/app/computer/actions';
import {
  latestScreenshotFromEvents,
  resolveComputerPanelView,
  type ComputerPanelView,
  type LatestScreenshot,
} from '@/lib/computerScreen';
import { Glass } from '@/ui/Glass';
import { useCommandStore } from '@/store/useCommandStore';

interface StatusPayload {
  workerConnected?: boolean;
  halted?: boolean;
  workerId?: string;
  latestScreenshot?: LatestScreenshot | null;
  stubUrl?: string | null;
  demo?: boolean;
  needs?: string;
}

export function ComputerPanel() {
  const open = useCommandStore((s) => s.contextPanel === 'computer');
  const closePanel = useCommandStore((s) => s.closePanel);
  const dataMode = useCommandStore((s) => s.dataMode);
  const events = useCommandStore((s) => s.events.buffer);
  const focusedProject = useCommandStore((s) => s.focusedProject);
  const [remote, setRemote] = useState<StatusPayload | null>(null);
  const [haltState, setHaltState] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/computer/status${focusedProject ? `?project=${encodeURIComponent(focusedProject)}` : ''}`);
        if (!res.ok) return;
        const body = (await res.json()) as StatusPayload;
        if (!cancelled) setRemote(body);
      } catch {
        if (!cancelled) setRemote(null);
      }
    };
    void load();
    const id = window.setInterval(() => void load(), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [open, focusedProject]);

  if (!open) return null;

  const fromEvents = latestScreenshotFromEvents(events, focusedProject);
  const latest = remote?.latestScreenshot ?? fromEvents;
  const view: ComputerPanelView = resolveComputerPanelView({
    latest,
    stubUrl: remote?.stubUrl ?? null,
    workerConnected: remote?.workerConnected === true,
    halted: remote?.halted === true,
  });

  async function halt() {
    const result = await haltComputerAction('*');
    if (!result.ok) {
      setHaltState(result.error ?? 'Could not halt');
      return;
    }
    setHaltState(
      result.demo
        ? 'Halt recorded locally (DEMO). No worker is connected.'
        : 'Halt written. The computer worker will stop within a few seconds.',
    );
  }

  return (
    <Glass className="fixed left-1/2 top-24 z-30 w-[min(420px,calc(100%-32px))] -translate-x-1/2 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-light tracking-[0.2em]">Computer</h3>
        <button type="button" onClick={closePanel} className="text-[11px] text-[var(--muted)]" aria-label="Close computer">
          Close
        </button>
      </div>
      <p className="text-xs text-[var(--muted)] leading-relaxed">{view.detail}</p>
      {dataMode === 'demo' && view.kind !== 'screenshot' ? (
        <p className="mt-2 text-[11px] tracking-[0.12em] text-[var(--muted)]">DEMO · no fake screenshots</p>
      ) : null}
      <div className="mt-4 aspect-video overflow-hidden rounded-lg border border-[var(--line)] bg-black/40">
        {view.kind === 'screenshot' && view.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={view.url} alt="Agent screen" className="h-full w-full object-contain" />
        ) : (
          <div className="grid h-full place-items-center text-[11px] tracking-[0.14em] text-[var(--muted)]">
            {view.kind === 'waiting' ? 'waiting for first frame' : 'coming online'}
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-[10px] tracking-[0.12em] text-[var(--muted)]">
        <span>{view.headline}</span>
        {view.source ? <span>{view.source}</span> : null}
      </div>
      {remote?.needs && view.kind === 'coming-online' ? (
        <p className="mt-2 text-[11px] leading-relaxed text-[var(--muted)]">{remote.needs}</p>
      ) : null}
      {haltState ? <p className="mt-2 text-[11px] text-[var(--s-attention)]">{haltState}</p> : null}
      <button
        type="button"
        onClick={() => void halt()}
        aria-label="Halt all computer agents"
        className="mt-3 w-full rounded-lg border border-[var(--line)] px-2 py-2 text-left text-[11px] text-[var(--muted)]"
      >
        Halt agents
      </button>
    </Glass>
  );
}

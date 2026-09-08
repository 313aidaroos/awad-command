'use client';

import { useEffect, useState, type ComponentType } from 'react';
import { startDataLayer, stopDataLayer } from '@/data';
import { detectQuality } from '@/lib/quality';
import { isWebGLAvailable } from '@/lib/webgl';
import { ApprovalCard } from '@/ui/ApprovalCard';
import { BootSequence } from '@/ui/BootSequence';
import { BootFallback, ClientErrorBoundary, WebGLFallback } from '@/ui/CanvasErrorBoundary';
import { CeoConsole } from '@/ui/CeoConsole';
import { CommandPalette } from '@/ui/CommandPalette';
import { ComputerPanel } from '@/ui/ComputerPanel';
import { EventStream } from '@/ui/EventStream';
import { Hotkeys } from '@/ui/Hotkeys';
import { HoverHud } from '@/ui/HoverHud';
import { ModeBar } from '@/ui/ModeBar';
import { MorningBriefing } from '@/ui/MorningBriefing';
import { NewsCorner } from '@/ui/NewsCorner';
import { ProjectHud } from '@/ui/ProjectHud';
import { TopBar } from '@/ui/TopBar';
import { useCommandStore } from '@/store/useCommandStore';

export function CommandShell() {
  // Closed until after hydration so SSR never mounts R3F/three.
  const [canvasEnabled, setCanvasEnabled] = useState(false);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [CanvasSlot, setCanvasSlot] = useState<ComponentType | null>(null);

  useEffect(() => {
    let live = true;
    const available = isWebGLAvailable();
    setWebgl(available);
    setCanvasEnabled(true);
    useCommandStore.getState().setQuality(detectQuality(), true);
    if (available) {
      void import('@/ui/EnabledCanvas')
        .then((mod) => {
          if (live) setCanvasSlot(() => mod.EnabledCanvas);
        })
        .catch((error: unknown) => {
          console.warn('[awad-command] canvas loader failed', error);
          if (live) setWebgl(false);
        });
    }
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    startDataLayer();
    return () => stopDataLayer();
  }, []);

  const mountCanvas = canvasEnabled && webgl === true && CanvasSlot;

  return (
    <div className="relative h-svh w-full overflow-hidden bg-[var(--void)]">
      <div className="absolute inset-0 bg-[var(--void)]" aria-hidden />
      {mountCanvas && CanvasSlot ? (
        <ClientErrorBoundary fallback={<WebGLFallback />}>
          <CanvasSlot />
        </ClientErrorBoundary>
      ) : canvasEnabled && webgl === false ? (
        <WebGLFallback />
      ) : null}
      <ClientErrorBoundary fallback={<BootFallback />}>
        <BootSequence />
      </ClientErrorBoundary>
      <TopBar />
      <ModeBar />
      <HoverHud />
      <EventStream />
      <NewsCorner />
      <ProjectHud />
      <ComputerPanel />
      <ApprovalCard />
      <MorningBriefing />
      <CeoConsole />
      <CommandPalette />
      <Hotkeys />
    </div>
  );
}

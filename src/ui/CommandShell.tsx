'use client';

import dynamic from 'next/dynamic';
import { useEffect, useLayoutEffect, useState } from 'react';
import { startDataLayer, stopDataLayer } from '@/data';
import { detectQuality } from '@/lib/quality';
import { isWebGLAvailable } from '@/lib/webgl';
import { ApprovalCard } from '@/ui/ApprovalCard';
import { BootSequence } from '@/ui/BootSequence';
import { ClientErrorBoundary, WebGLFallback } from '@/ui/CanvasErrorBoundary';
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

const CommandCanvas = dynamic(
  () => import('@/scene/CommandCanvas').then((m) => m.CommandCanvas),
  { ssr: false },
);

export function CommandShell() {
  const setQuality = useCommandStore((s) => s.setQuality);
  const [webgl, setWebgl] = useState<boolean | null>(null);

  useLayoutEffect(() => {
    setQuality(detectQuality(), true);
    setWebgl(isWebGLAvailable());
  }, [setQuality]);

  useEffect(() => {
    startDataLayer();
    return () => stopDataLayer();
  }, []);

  return (
    <div className="relative h-svh w-full overflow-hidden bg-[var(--void)]">
      {webgl === false ? (
        <WebGLFallback />
      ) : webgl ? (
        <div className="absolute inset-0">
          <ClientErrorBoundary fallback={<WebGLFallback />}>
            <CommandCanvas />
          </ClientErrorBoundary>
        </div>
      ) : null}
      <BootSequence />
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

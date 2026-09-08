'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { startDataLayer, stopDataLayer } from '@/data';
import { detectQuality } from '@/lib/quality';
import { ApprovalCard } from '@/ui/ApprovalCard';
import { BootSequence } from '@/ui/BootSequence';
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

  useEffect(() => {
    setQuality(detectQuality(), true);
    startDataLayer();
    return () => stopDataLayer();
  }, [setQuality]);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[var(--void)]">
      <CommandCanvas />
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

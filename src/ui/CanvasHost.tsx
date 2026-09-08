'use client';

import { CommandCanvas } from '@/scene/CommandCanvas';

/** Isolated R3F mount. Never imported from CommandShell on WebKit. */
export function CanvasHost() {
  return (
    <div className="absolute inset-0">
      <CommandCanvas />
    </div>
  );
}

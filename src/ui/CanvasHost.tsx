'use client';

import { CommandCanvas } from '@/scene/CommandCanvas';

/** Isolated R3F mount. Loaded after hydration via EnabledCanvas on every browser, including Safari. */
export function CanvasHost() {
  return (
    <div className="absolute inset-0">
      <CommandCanvas />
    </div>
  );
}

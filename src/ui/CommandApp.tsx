'use client';

import { ClientErrorBoundary, ShellRecovery } from '@/ui/CanvasErrorBoundary';
import { CommandShell } from '@/ui/CommandShell';

/** Parent of the client shell so render errors never reach Next's document replace. */
export function CommandApp() {
  return (
    <ClientErrorBoundary fallback={<ShellRecovery />}>
      <CommandShell />
    </ClientErrorBoundary>
  );
}

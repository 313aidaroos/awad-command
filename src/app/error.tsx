'use client';

import { ShellRecovery } from '@/ui/CanvasErrorBoundary';

export default function RouteError({ reset }: { error: Error; reset: () => void }) {
  return <ShellRecovery onRetry={reset} />;
}

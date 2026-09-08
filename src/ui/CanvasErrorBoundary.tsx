'use client';

import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { useCommandStore } from '@/store/useCommandStore';

interface BoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface BoundaryState {
  error: Error | null;
}

export class ClientErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[awad-command] client exception', error.message, info.componentStack);
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return <ShellRecovery onRetry={this.reset} />;
  }
}

export function BootFallback() {
  useEffect(() => {
    useCommandStore.getState().finishBoot();
  }, []);
  return null;
}

export function WebGLFallback() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 grid place-items-center">
      <div className="glass pointer-events-auto max-w-sm px-5 py-4 text-center text-[13px] text-[var(--muted)]">
        <p className="text-[var(--text)]">3D view unavailable</p>
        <p className="mt-2">
          This browser could not start WebGL. The command HUD is still available.
        </p>
      </div>
    </div>
  );
}

export function ShellRecovery({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="relative grid h-svh w-full place-items-center overflow-hidden bg-[var(--void)]">
      <div className="glass max-w-sm px-5 py-4 text-center text-[13px] text-[var(--muted)]">
        <p className="text-[var(--text)]">Command recovered</p>
        <p className="mt-2">
          A client exception was caught. The HUD can continue after a reload. The 3D canvas stays
          off on Safari/WebKit.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-full border border-[var(--line)] px-3 py-1.5 text-[11px] text-[var(--text)]"
            >
              Retry
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-[var(--accent)]/20 px-3 py-1.5 text-[11px] text-[var(--text)]"
          >
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}

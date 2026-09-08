'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface BoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
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
    console.warn('[awad-command] canvas/effects failed', error.message, info.componentStack);
  }

  render() {
    if (this.state.error) return this.props.fallback;
    return this.props.children;
  }
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

import type { ReactNode } from 'react';

export function WorldName({ children, primary = false }: { children: ReactNode; primary?: boolean }) {
  return (
    <div
      style={{
        fontFamily: 'Inter Tight, system-ui, sans-serif',
        fontSize: primary ? 13 : 12,
        letterSpacing: '0.22em',
        fontWeight: 450,
        lineHeight: 1.2,
        color: primary ? '#E6E8EC' : 'rgba(230,232,236,0.72)',
        textShadow: '0 2px 18px rgba(0,0,0,0.92)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </div>
  );
}

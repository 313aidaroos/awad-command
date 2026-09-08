import type { ReactNode } from 'react';

export function WorldName({ children, primary = false }: { children: ReactNode; primary?: boolean }) {
  return (
    <div
      style={{
        fontSize: primary ? 12 : 11,
        letterSpacing: '0.16em',
        fontWeight: primary ? 450 : 400,
        lineHeight: 1.2,
        color: primary ? '#E6E8EC' : '#C5CAD3',
        padding: '3px 0 0',
        textShadow: '0 1px 8px rgba(0,0,0,0.85)',
      }}
    >
      {children}
    </div>
  );
}

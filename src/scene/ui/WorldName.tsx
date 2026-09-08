import type { ReactNode } from 'react';

export function WorldName({ children, primary = false }: { children: ReactNode; primary?: boolean }) {
  return (
    <div
      style={{
        fontSize: primary ? 13 : 12,
        letterSpacing: '0.12em',
        fontWeight: primary ? 560 : 500,
        lineHeight: 1.15,
        color: primary ? '#FFFFFF' : '#EEF1F5',
        padding: primary ? '4px 10px' : '3px 8px',
        borderRadius: 999,
        background: primary ? 'rgba(7,8,10,0.78)' : 'rgba(7,8,10,0.58)',
        border: primary ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.45)',
        textShadow: '0 1px 2px rgba(0,0,0,0.9)',
      }}
    >
      {children}
    </div>
  );
}

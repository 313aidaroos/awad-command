import type { ReactNode } from 'react';

export function WorldName({ children, primary = false }: { children: ReactNode; primary?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: 'Inter Tight, system-ui, sans-serif',
        fontSize: primary ? 14 : 13,
        letterSpacing: '0.18em',
        fontWeight: 500,
        lineHeight: 1.2,
        color: primary ? '#F4F6F8' : '#E6E8EC',
        padding: '5px 12px 5px 10px',
        borderRadius: 8,
        background: primary ? 'rgba(7,8,10,0.42)' : 'rgba(7,8,10,0.28)',
        border: primary ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        textShadow: '0 1px 12px rgba(0,0,0,0.85)',
      }}
    >
      <span
        style={{
          width: 12,
          height: 1,
          background: primary ? 'rgba(61,139,255,0.85)' : 'rgba(230,232,236,0.45)',
          flexShrink: 0,
        }}
      />
      {children}
    </div>
  );
}

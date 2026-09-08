'use client';

import { useEffect } from 'react';
import { useCommandStore } from '@/store/useCommandStore';

export function Hotkeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const state = useCommandStore.getState();
      if (e.key === 'Escape') {
        if (state.paletteOpen) {
          state.togglePalette(false);
          return;
        }
        if (state.contextPanel === 'briefing' || state.contextPanel === 'computer' || state.contextPanel === 'approval') {
          state.closePanel();
          return;
        }
        if (state.focusedProject) state.returnToUniverse();
      }
      if (e.key === '1') state.setMode('default');
      if (e.key === '2') state.setMode('economy');
      if (e.key === '3') state.setMode('workforce');
      if (e.key.toLowerCase() === 'a' && !isTyping(e)) state.setMode('analytics');
      if (e.key.toLowerCase() === 'e' && !isTyping(e)) state.toggleEventStream();
      if (e.key === '/' && !isTyping(e)) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[placeholder*="Ask AWAD CEO"]')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return null;
}

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return Boolean(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable));
}

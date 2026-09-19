'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCommandStore } from '@/store/useCommandStore';
import type { ContextPanel } from '@/store/types';

const PANELS: ContextPanel[] = ['agent', 'analytics', 'briefing', 'approval', 'computer', 'lead'];

/** Locks page scroll for the 3D deck and honours ?panel= deep links from the landing. */
export function DeckBody() {
  const params = useSearchParams();
  useEffect(() => {
    document.body.classList.add('deck');
    return () => document.body.classList.remove('deck');
  }, []);
  useEffect(() => {
    const panel = params.get('panel') as ContextPanel | null;
    if (!panel || !PANELS.includes(panel)) return;
    const unsub = useCommandStore.subscribe((s) => {
      if (s.booted) {
        s.openPanel(panel);
        unsub();
      }
    });
    return unsub;
  }, [params]);
  return null;
}

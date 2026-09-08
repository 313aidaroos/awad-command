'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCommandStore } from '@/store/useCommandStore';

const BOOT_MS = 780;

export function BootSequence() {
  const booted = useCommandStore((s) => s.booted);

  useEffect(() => {
    if (booted) return;
    const skip = () => useCommandStore.getState().finishBoot();
    window.addEventListener('keydown', skip);
    window.addEventListener('pointerdown', skip);
    const t = window.setTimeout(skip, BOOT_MS);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
    };
  }, [booted]);

  return (
    <AnimatePresence>
      {!booted && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
        >
          <motion.h1
            className="font-light tracking-[0.46em] text-[clamp(18px,4vw,34px)] text-[rgba(230,232,236,0.88)]"
            initial={{ opacity: 0, letterSpacing: '0.7em' }}
            animate={{ opacity: 1, letterSpacing: '0.46em' }}
            transition={{ duration: 0.55 }}
          >
            AWAD COMMAND
          </motion.h1>
          <motion.p
            className="mt-3 text-[10px] tracking-[0.28em] text-[var(--muted)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.18, duration: 0.35 }}
          >
            Skip
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

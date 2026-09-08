'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { projects } from '@/projects/registry';
import { useCommandStore } from '@/store/useCommandStore';

export function BootSequence() {
  const booted = useCommandStore((s) => s.booted);
  const finishBoot = useCommandStore((s) => s.finishBoot);
  const runtimes = useCommandStore((s) => s.projects);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 4200);
    const skip = () => finishBoot();
    window.addEventListener('keydown', skip);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', skip);
    };
  }, [finishBoot]);

  useEffect(() => {
    if (ready && !booted) finishBoot();
  }, [ready, booted, finishBoot]);

  return (
    <AnimatePresence>
      {!booted && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[var(--void)]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          onClick={() => finishBoot()}
        >
          <motion.h1
            className="font-light tracking-[0.4em] text-[clamp(22px,5vw,44px)]"
            initial={{ opacity: 0, letterSpacing: '0.4em' }}
            animate={{ opacity: 1, letterSpacing: '0.3em' }}
            transition={{ duration: 1.2, delay: 0.2 }}
          >
            AWAD COMMAND
          </motion.h1>
          <motion.p
            className="text-xs text-[var(--muted)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            Initializing AI ecosystem
          </motion.p>
          <div className="font-num w-60 text-xs text-[var(--muted)] space-y-1">
            {projects.map((project, i) => {
              const status = runtimes[project.slug]?.status ?? project.initialStatus;
              const color =
                status === 'attention'
                  ? 'text-[var(--s-attention)]'
                  : status === 'idle'
                    ? 'text-[var(--muted)]'
                    : 'text-[var(--s-active)]';
              return (
                <motion.div
                  key={project.slug}
                  className="flex justify-between"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.8 + i * 0.12 }}
                >
                  <span>{project.name}</span>
                  <span className={color}>{status.toUpperCase()}</span>
                </motion.div>
              );
            })}
            <motion.div
              className="flex justify-between"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.8 + projects.length * 0.12 }}
            >
              <span>CEO</span>
              <span className="text-[var(--s-active)]">ONLINE</span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

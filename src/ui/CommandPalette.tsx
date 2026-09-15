'use client';

import { useEffect } from 'react';
import { Command } from 'cmdk';
import { haltComputerAction } from '@/app/computer/actions';
import { requestCeoOpen } from '@/lib/ceoBridge';
import { projects } from '@/projects/registry';
import { useCommandStore } from '@/store/useCommandStore';

export function CommandPalette() {
  const open = useCommandStore((s) => s.paletteOpen);
  const toggle = useCommandStore((s) => s.togglePalette);
  const enter = useCommandStore((s) => s.enterProject);
  const back = useCommandStore((s) => s.returnToUniverse);
  const setMode = useCommandStore((s) => s.setMode);
  const setQuality = useCommandStore((s) => s.setQuality);
  const openPanel = useCommandStore((s) => s.openPanel);
  const toggleNews = useCommandStore((s) => s.toggleNews);
  const toggleEventStream = useCommandStore((s) => s.toggleEventStream);
  const voiceMuted = useCommandStore((s) => s.voiceMuted);
  const setVoiceMuted = useCommandStore((s) => s.setVoiceMuted);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 grid place-items-start justify-center pt-[18vh] bg-black/40">
      <Command
        className="glass w-[min(560px,calc(100%-32px))] p-3"
        label="AWAD COMMAND"
        onKeyDown={(e) => {
          if (e.key === 'Escape') toggle(false);
        }}
      >
        <div className="mb-2 text-[10px] tracking-[0.2em] text-[var(--muted)]">AWAD COMMAND</div>
        <Command.Input
          autoFocus
          placeholder="Navigate, modes, or ask the CEO…"
          className="mb-2 w-full bg-transparent text-sm outline-none"
        />
        <Command.List className="max-h-80 overflow-auto text-sm">
          <Command.Empty className="py-3 text-[var(--muted)]">No match</Command.Empty>
          <Command.Group heading="Navigate" className="text-[10px] tracking-[0.12em] text-[var(--muted)]">
            <Command.Item className="cursor-pointer rounded-md px-2 py-1.5 text-[var(--text)]" onSelect={() => { back(); toggle(false); }}>
              Universe
            </Command.Item>
            {projects.map((project) => (
              <Command.Item
                key={project.slug}
                className="cursor-pointer rounded-md px-2 py-1.5 text-[var(--text)]"
                onSelect={() => {
                  enter(project.slug);
                  toggle(false);
                }}
              >
                {project.name}
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Group heading="Modes">
            <Command.Item className="cursor-pointer rounded-md px-2 py-1.5" onSelect={() => { setMode('economy'); toggle(false); }}>
              Economy
            </Command.Item>
            <Command.Item className="cursor-pointer rounded-md px-2 py-1.5" onSelect={() => { setMode('workforce'); toggle(false); }}>
              Workforce
            </Command.Item>
            <Command.Item className="cursor-pointer rounded-md px-2 py-1.5" onSelect={() => { setMode('analytics'); toggle(false); }}>
              Analytics
            </Command.Item>
            <Command.Item
              className="cursor-pointer rounded-md px-2 py-1.5"
              onSelect={() => {
                enter('rawixis');
                toggle(false);
              }}
            >
              Problems
            </Command.Item>
          </Command.Group>
          <Command.Group heading="Actions">
            <Command.Item
              className="cursor-pointer rounded-md px-2 py-1.5"
              onSelect={() => {
                requestCeoOpen();
                toggle(false);
              }}
            >
              Ask CEO
            </Command.Item>
            <Command.Item className="cursor-pointer rounded-md px-2 py-1.5" onSelect={() => { toggleEventStream(); toggle(false); }}>
              Events
            </Command.Item>
            <Command.Item className="cursor-pointer rounded-md px-2 py-1.5" onSelect={() => { toggleNews(); toggle(false); }}>
              News
            </Command.Item>
            <Command.Item className="cursor-pointer rounded-md px-2 py-1.5" onSelect={() => { openPanel('computer'); toggle(false); }}>
              Computer
            </Command.Item>
            <Command.Item
              className="cursor-pointer rounded-md px-2 py-1.5"
              onSelect={() => {
                void haltComputerAction('*');
                openPanel('computer');
                toggle(false);
              }}
            >
              Halt agents
            </Command.Item>
            <Command.Item className="cursor-pointer rounded-md px-2 py-1.5" onSelect={() => { openPanel('briefing'); toggle(false); }}>
              Briefing
            </Command.Item>
            <Command.Item className="cursor-pointer rounded-md px-2 py-1.5" onSelect={() => { setQuality('high'); toggle(false); }}>
              Quality High
            </Command.Item>
            <Command.Item className="cursor-pointer rounded-md px-2 py-1.5" onSelect={() => { setQuality('medium'); toggle(false); }}>
              Quality Medium
            </Command.Item>
            <Command.Item className="cursor-pointer rounded-md px-2 py-1.5" onSelect={() => { setQuality('low'); toggle(false); }}>
              Quality Low
            </Command.Item>
            <Command.Item className="cursor-pointer rounded-md px-2 py-1.5" onSelect={() => { toggle(false); }}>
              Time machine · coming
            </Command.Item>
            <Command.Item
              className="cursor-pointer rounded-md px-2 py-1.5"
              onSelect={() => {
                setVoiceMuted(!voiceMuted);
                toggle(false);
              }}
            >
              {voiceMuted ? 'Unmute CEO voice' : 'Mute CEO voice'}
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}

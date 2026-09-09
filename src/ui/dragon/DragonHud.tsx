'use client';

import { useEffect, useMemo, useState } from 'react';
import { requestCeoAsk, requestCeoOpen } from '@/lib/ceoBridge';
import { money } from '@/lib/format';
import { getProject, projects } from '@/projects/registry';
import { Metric } from '@/ui/Metric';
import { useCommandStore } from '@/store/useCommandStore';
import type { ModeName } from '@/store/types';

function useEmpireTotals() {
  const runtimes = useCommandStore((s) => s.projects);
  const agents = useCommandStore((s) => s.agents);
  return useMemo(() => {
    let today = 0;
    let month = 0;
    let costs = 0;
    let profit = 0;
    let online = 0;
    for (const project of projects) {
      const runtime = runtimes[project.slug];
      if (!runtime) continue;
      today += runtime.metrics.revenueToday ?? 0;
      const series = runtime.metrics.revenue30d ?? [];
      month += series.reduce((sum, n) => sum + n, 0);
      costs += runtime.metrics.operatingCosts ?? 0;
      profit += runtime.metrics.profit ?? 0;
      if (runtime.status !== 'offline' && !project.comingSoon) online += 1;
    }
    return {
      today,
      month,
      costs,
      profit,
      agents: Object.keys(agents).length,
      online,
      total: projects.length,
    };
  }, [agents, runtimes]);
}

export function DragonHud() {
  const view = useCommandStore((s) => s.view);
  const mode = useCommandStore((s) => s.mode);
  const dataMode = useCommandStore((s) => s.dataMode);
  const shenronMode = useCommandStore((s) => s.shenronMode);
  const setShenronMode = useCommandStore((s) => s.setShenronMode);
  const setMode = useCommandStore((s) => s.setMode);
  const returnToUniverse = useCommandStore((s) => s.returnToUniverse);
  const openPanel = useCommandStore((s) => s.openPanel);
  const togglePalette = useCommandStore((s) => s.togglePalette);
  const events = useCommandStore((s) => s.events.buffer);
  const runtimes = useCommandStore((s) => s.projects);
  const totals = useEmpireTotals();
  const [ask, setAsk] = useState('');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (view !== 'universe') return null;

  const attention = Object.entries(runtimes)
    .filter(([, runtime]) => runtime.status === 'attention' || runtime.status === 'error' || runtime.status === 'warning')
    .slice(0, 3);
  const pulse = events.slice(0, 3);
  const clock = now.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const go = (next: ModeName | 'universe' | 'reality' | 'notes' | 'goals' | 'money') => {
    if (next === 'universe') {
      setMode('default');
      returnToUniverse();
      return;
    }
    if (next === 'money' || next === 'economy') setMode('economy');
    else if (next === 'workforce') setMode('workforce');
    else if (next === 'reality') openPanel('computer');
    else if (next === 'notes' || next === 'goals') openPanel('briefing');
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-20 text-[#F6E7C8]">
      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-5 pt-4">
        <div>
          <div className="text-[13px] font-semibold tracking-[0.28em] text-[#F3C77A]">
            AWAD COMMAND
            {dataMode === 'demo' ? <span className="tag ml-2 border-[#F3C77A]/35 text-[#F3C77A]">DEMO</span> : null}
          </div>
          <div className="mt-1 text-[9px] tracking-[0.22em] text-[#E8C48A]/80">BUILD · AUTOMATE · DOMINATE</div>
        </div>
        <div className="hidden max-w-[280px] text-center text-[10px] tracking-[0.16em] text-[#F3C77A]/80 md:block">
          A HIGHER VISION FOR A GREATER REALITY
        </div>
        <div className="text-right">
          <div className="font-num text-[11px] text-[#F6E7C8]">{clock}</div>
          <div className="text-[9px] tracking-[0.14em] text-[#E8C48A]/70">DISCIPLINE CREATES FREEDOM</div>
          <button
            type="button"
            onClick={() => togglePalette(true)}
            className="pointer-events-auto mt-1 text-[10px] tracking-[0.16em] text-[#E8C48A]/70"
          >
            ⌘K
          </button>
        </div>
      </header>

      <aside className="pointer-events-auto absolute left-4 top-20 hidden w-[250px] rounded-[14px] border border-[rgba(243,199,122,0.22)] bg-[rgba(16,10,6,0.55)] p-3.5 backdrop-blur-[18px] lg:block">
        <h3 className="mb-2 text-[10px] tracking-[0.18em] text-[#F3C77A]">EMPIRE STATS</h3>
        <ul className="space-y-1.5 text-[12px]">
          <li className="flex justify-between">
            <span className="text-[#C9B38A]">Revenue today</span>
            <Metric value={money(totals.today)} />
          </li>
          <li className="flex justify-between">
            <span className="text-[#C9B38A]">This month</span>
            <Metric value={money(totals.month)} />
          </li>
          <li className="flex justify-between">
            <span className="text-[#C9B38A]">Expenses</span>
            <Metric value={money(totals.costs)} />
          </li>
          <li className="flex justify-between">
            <span className="text-[#C9B38A]">Net profit</span>
            <Metric value={money(totals.profit)} />
          </li>
          <li className="flex justify-between pt-1 text-[11px] text-[#E8C48A]">
            <span>Active agents</span>
            <Metric value={String(totals.agents)} />
          </li>
          <li className="flex justify-between text-[11px] text-[#E8C48A]">
            <span>Projects online</span>
            <Metric value={`${totals.online}/${totals.total}`} />
          </li>
        </ul>
      </aside>

      <aside className="pointer-events-auto absolute right-4 top-20 hidden w-[270px] space-y-2 lg:block">
        <div className="rounded-[14px] border border-[rgba(243,199,122,0.22)] bg-[rgba(16,10,6,0.55)] p-3.5 backdrop-blur-[18px]">
          <h3 className="mb-2 text-[10px] tracking-[0.18em] text-[#F3C77A]">WORLD PULSE</h3>
          {pulse.length === 0 ? (
            <p className="text-[11px] text-[#C9B38A]">Waiting on the first live beat.</p>
          ) : (
            pulse.map((event) => (
              <div key={event.id} className="border-t border-[rgba(243,199,122,0.12)] py-1.5 text-[11px] first:border-0">
                {event.summary}
                <div className="mt-0.5 text-[9px] tracking-[0.12em] text-[#E8C48A]/70">
                  Potential impact: {getProject(event.projectSlug)?.name ?? event.projectSlug}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="rounded-[14px] border border-[rgba(232,80,80,0.28)] bg-[rgba(24,8,8,0.5)] p-3.5 backdrop-blur-[18px]">
          <h3 className="mb-2 text-[10px] tracking-[0.18em] text-[#F0A0A0]">NEEDS YOUR ATTENTION</h3>
          {attention.length === 0 ? (
            <p className="text-[11px] text-[#C9B38A]">No realm is escalating.</p>
          ) : (
            attention.map(([slug, runtime]) => (
              <div key={slug} className="py-1 text-[11px]">
                {getProject(slug)?.name ?? slug} · {runtime.status}
              </div>
            ))
          )}
        </div>
      </aside>

      <footer className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-3">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2">
          <div className="hidden w-full justify-between text-[10px] tracking-[0.12em] text-[#E8C48A]/80 md:flex">
            <div className="pointer-events-auto rounded-[12px] border border-[rgba(243,199,122,0.18)] bg-[rgba(16,10,6,0.5)] px-3 py-2 backdrop-blur-[16px]">
              <div className="mb-1 text-[#F3C77A]">TODAY&apos;S PRIORITIES</div>
              {(attention[0] ? [`Review ${getProject(attention[0][0])?.name ?? 'realm'} leads`] : ['Scan the realms']).map((item) => (
                <div key={item}>{item}</div>
              ))}
            </div>
            <div className="pointer-events-auto flex items-center gap-2">
              <span className="text-[9px] tracking-[0.14em] text-[#E8C48A]/70">EMPIRE MODE</span>
              <button
                type="button"
                onClick={() => setShenronMode(!shenronMode)}
                className={`rounded-full border px-3 py-1.5 text-[11px] tracking-[0.16em] ${
                  shenronMode
                    ? 'border-[#4ADE80] bg-[#14532D]/70 text-[#86EFAC]'
                    : 'border-[rgba(74,222,128,0.45)] bg-[rgba(16,40,20,0.55)] text-[#86EFAC]'
                }`}
              >
                SHENRON MODE
              </button>
            </div>
          </div>

          <form
            className="pointer-events-auto flex w-full max-w-xl items-center gap-2 rounded-full border border-[rgba(243,199,122,0.35)] bg-[rgba(16,10,6,0.62)] px-4 py-2 backdrop-blur-[18px]"
            onSubmit={(e) => {
              e.preventDefault();
              const text = ask.trim();
              if (text) {
                requestCeoAsk(text);
                setAsk('');
              } else {
                requestCeoOpen();
              }
            }}
          >
            <input
              value={ask}
              onChange={(e) => setAsk(e.target.value)}
              placeholder="Ask AWAD CEO… (e.g. What's happening today?)"
              className="w-full bg-transparent text-[13px] text-[#F6E7C8] outline-none placeholder:text-[#C9B38A]"
              aria-label="Ask AWAD CEO"
            />
            <button type="submit" className="text-[12px] tracking-[0.14em] text-[#F3C77A]">
              ASK
            </button>
          </form>

          <nav className="pointer-events-auto flex flex-wrap justify-center gap-1">
            {(
              [
                ['Universe', 'universe'],
                ['Money', 'money'],
                ['Workforce', 'workforce'],
                ['Economy', 'economy'],
                ['Reality', 'reality'],
                ['Notes', 'notes'],
                ['Goals', 'goals'],
              ] as const
            ).map(([label, id]) => {
              const active =
                (id === 'universe' && mode === 'default') ||
                (id === 'economy' && mode === 'economy') ||
                (id === 'money' && mode === 'economy') ||
                (id === 'workforce' && mode === 'workforce');
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => go(id)}
                  className={`rounded-full px-2.5 py-1 text-[10px] tracking-[0.14em] ${
                    active ? 'bg-[#F3C77A]/20 text-[#F3C77A]' : 'text-[#C9B38A]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </nav>
        </div>
      </footer>
    </div>
  );
}

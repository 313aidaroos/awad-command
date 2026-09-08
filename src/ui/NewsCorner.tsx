'use client';

import { useState } from 'react';
import { Glass } from '@/ui/Glass';
import { useCommandStore } from '@/store/useCommandStore';

const DEMO_NEWS = [
  { region: 'eu', title: 'ECB holds rates steady, signals cautious path into autumn', source: 'Reuters · demo' },
  { region: 'me', title: 'Gulf states outline joint energy-transition fund at Riyadh summit', source: 'Al Jazeera · demo' },
  { region: 'eu', title: 'EU ministers agree framework on AI infrastructure investment', source: 'Politico Europe · demo' },
  { region: 'me', title: 'Turkey and Egypt expand trade corridor agreement', source: 'Reuters · demo' },
];

export function NewsCorner() {
  const open = useCommandStore((s) => s.newsOpen);
  const view = useCommandStore((s) => s.view);
  const [filter, setFilter] = useState<'all' | 'eu' | 'me'>('all');
  if (!open || view !== 'universe') return null;
  const items = DEMO_NEWS.filter((n) => filter === 'all' || n.region === filter).slice(0, 4);
  return (
    <Glass className="fixed right-4 top-16 z-20 hidden lg:block w-[280px] p-3.5">
      <h4 className="mb-2 flex items-center justify-between text-[10px] tracking-[0.14em] text-[var(--muted)] font-normal">
        <span>
          <span className="dot" />
          Europe & Middle East
        </span>
        <span className="tag" style={{ margin: 0 }}>
          demo headlines
        </span>
      </h4>
      <div className="mb-2 flex gap-1">
        {(['all', 'eu', 'me'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full px-2 py-0.5 text-[10px] ${
              filter === key ? 'bg-white/8 text-[var(--text)]' : 'text-[var(--muted)]'
            }`}
          >
            {key === 'all' ? 'Both' : key === 'eu' ? 'Europe' : 'Middle East'}
          </button>
        ))}
      </div>
      {items.map((item) => (
        <div key={item.title} className="border-t border-[var(--line)] py-1.5 text-xs leading-snug first:border-0">
          {item.title}
          <small className="mt-0.5 block font-num text-[10px] text-[var(--muted)]">{item.source}</small>
        </div>
      ))}
    </Glass>
  );
}

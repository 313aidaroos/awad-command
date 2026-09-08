import { getProject, projects } from '@/projects/registry';

export type CeoIntent =
  | { type: 'enter'; slug: string }
  | { type: 'universe' }
  | { type: 'mode'; mode: 'economy' | 'workforce' | 'analytics' | 'default' }
  | { type: 'problems' };

export function parseIntents(text: string): CeoIntent[] {
  const q = text.toLowerCase();
  const intents: CeoIntent[] = [];
  if (/\b(universe|home|back)\b/.test(q)) intents.push({ type: 'universe' });
  if (/\banalytic/.test(q)) intents.push({ type: 'mode', mode: 'analytics' });
  if (/\beconomy\b/.test(q)) intents.push({ type: 'mode', mode: 'economy' });
  if (/\bworkforce\b/.test(q)) intents.push({ type: 'mode', mode: 'workforce' });
  if (/\b(problems?|issues?|attention|three)\b/.test(q)) intents.push({ type: 'problems' });
  for (const project of projects) {
    if (q.includes(project.slug) || q.includes(project.name.toLowerCase())) {
      intents.push({ type: 'enter', slug: project.slug });
    }
  }
  const show = q.match(/show (?:me )?([a-z0-9-]+)/);
  if (show?.[1] && getProject(show[1])) intents.push({ type: 'enter', slug: show[1] });
  return intents;
}

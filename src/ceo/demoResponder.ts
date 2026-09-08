import { ALL_LEADS, getLeadBySlug, SYSTEM_CONTACTS } from '@/config/orbLeads';
import { attentionItems } from '@/ceo/buildContext';
import { money } from '@/lib/format';
import { projects } from '@/projects/registry';
import type { ProposeApprovalArgs } from '@/ceo/tools';
import type { CommandState } from '@/store/types';

export interface DemoAnswer {
  text: string;
  approval?: ProposeApprovalArgs;
}

export function demoResponder(
  message: string,
  state: Pick<CommandState, 'dataMode' | 'projects' | 'agents' | 'events' | 'approvals'>,
): DemoAnswer {
  const q = message.toLowerCase();
  const caveat = state.dataMode === 'demo' ? 'Figures are DEMO until live sources connect. ' : '';

  if (/deploy|landing page/.test(q)) {
    return {
      text: `${caveat}I would stage the Contraxis landing page behind Approve. Nothing goes live until you tap Approve — record only in Phase 1.`,
      approval: {
        title: 'Deploy the new Contraxis landing page',
        description: 'Record-only approval. No deploy runs from this card tonight.',
        kind: 'deploy',
        risk: 'medium',
      },
    };
  }

  if (/who (owns|leads)|which lead|lead owns/.test(q)) {
    const hit = projects.find((p) => q.includes(p.slug) || q.includes(p.name.toLowerCase()));
    if (hit) {
      const lead = getLeadBySlug(hit.slug);
      if (lead) {
        return {
          text: `${caveat}${hit.name} is owned by ${lead.leadName} (${lead.agentId}). Message that lead from the ProjectWorld HUD.`,
        };
      }
      return { text: `${caveat}${hit.name} has no hub lead wired yet.` };
    }
    const systemHit = SYSTEM_CONTACTS.find(
      (c) => q.includes(c.slug.replace(/^_/, '')) || q.includes(c.leadName.toLowerCase()),
    );
    if (systemHit) {
      return {
        text: `${caveat}${systemHit.leadName} is a system contact (${systemHit.agentId}), not an orb.`,
      };
    }
    return {
      text: `${caveat}Lead map:\n${ALL_LEADS.map((l) => `• ${l.slug} → ${l.leadName}`).join('\n')}`,
    };
  }

  if (/how much|made today|revenue/.test(q)) {
    const total = Object.values(state.projects).reduce(
      (sum, p) => sum + Number(p.metrics.revenueToday ?? 0),
      0,
    );
    return { text: `${caveat}Revenue today across the deck is ${money(total)}.` };
  }

  if (/compare/.test(q) && q.includes('socixis') && q.includes('contraxis')) {
    const a = state.projects.contraxis;
    const b = state.projects.socixis;
    return {
      text: `${caveat}Contraxis MRR ${money(Number(a?.metrics.mrr ?? 0))} vs Socixis ${money(Number(b?.metrics.mrr ?? 0))}. Contraxis is the contractor marketplace; Socixis is café social.`,
    };
  }

  if (/slowing|contraxis/.test(q) && /why|slow/.test(q)) {
    return {
      text: `${caveat}Contraxis is operational. Demo traffic shows lead volume healthy with conversion around 11%. Watch contractor response time before changing spend.`,
    };
  }

  if (/overnight|accomplish/.test(q)) {
    const overnight = state.events.buffer.slice(0, 8).map((e) => e.summary);
    return {
      text: `${caveat}Overnight (demo stream): ${overnight.join('; ') || 'quiet so far'}.`,
    };
  }

  if (/attention|problem|issue|need/.test(q)) {
    const items = attentionItems(state);
    return {
      text: `${caveat}${items[0] ? items.slice(0, 3).join('. ') : 'No hard alarms. Rawixis is the attention orb if you want to inspect.'}`,
    };
  }

  if (/happening|going on|status/.test(q)) {
    const live = projects
      .filter((p) => state.projects[p.slug]?.status === 'operational')
      .map((p) => p.name)
      .slice(0, 4);
    return {
      text: `${caveat}Universe is up. ${live.join(', ')} are operational. Click any orb to talk to its lead bot.`,
    };
  }

  const project = projects.find((p) => q.includes(p.slug) || q.includes(p.name.toLowerCase()));
  if (project) {
    const lead = getLeadBySlug(project.slug);
    const runtime = state.projects[project.slug];
    return {
      text: `${caveat}${project.name}: ${project.tagline}. Status ${runtime?.status ?? project.initialStatus}. ${
        lead ? `Lead ${lead.leadName} (${lead.agentId}).` : 'No hub lead on this orb.'
      }`,
    };
  }

  const items = attentionItems(state);
  return {
    text: `${caveat}${items[0] ?? 'Deck is quiet. Ask who owns a company, or tell me to show Contraxis.'}`,
  };
}

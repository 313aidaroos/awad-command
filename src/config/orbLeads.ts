export type LeadKind = 'product' | 'system';

export interface LeadContact {
  slug: string;
  leadName: string;
  agentId: string;
  kind: LeadKind;
  comingSoon?: boolean;
}

/** Product Lead bots already live in the hub — each orb talks to one. */
export const PRODUCT_LEADS: LeadContact[] = [
  {
    slug: 'contraxis',
    leadName: 'Contraxis Lead',
    agentId: 'd4261445-439f-419e-9c3d-7db2d769676f',
    kind: 'product',
  },
  {
    slug: 'socixis',
    leadName: 'Socixis Lead',
    agentId: '8e5056f3-642b-42ec-9c3b-b17803afa2ac',
    kind: 'product',
  },
  {
    slug: 'lyrixis',
    leadName: 'Lyrixis Lead',
    agentId: 'b92c8845-aa75-445f-8156-bf2e8c51a9a3',
    kind: 'product',
  },
  {
    slug: 'halaxis',
    leadName: 'Halaxis Lead',
    agentId: '7da5afaa-d04a-44f3-8d0c-695260264161',
    kind: 'product',
  },
  {
    slug: 'rawixis',
    leadName: 'Rawixis Lead',
    agentId: 'ab3f9f13-6c25-410d-b941-410e1aa6f276',
    kind: 'product',
  },
  {
    slug: 'awadbot',
    leadName: 'AwadBot Lead',
    agentId: '4288dd32-bca5-413e-8636-5651e41ef3bf',
    kind: 'product',
  },
  {
    slug: 'apixis',
    leadName: 'Apixis Lead',
    agentId: 'fa4ded99-57a0-4963-b55f-4e6439348591',
    kind: 'product',
  },
  {
    slug: 'nursery-toons',
    leadName: 'Nursery Toon Lead',
    agentId: 'a769a50c-c92e-4e3e-ad0f-00eb45c175d2',
    kind: 'product',
    comingSoon: true,
  },
  {
    slug: 'qahwahworld',
    leadName: 'Qahwahworld Lead',
    agentId: 'bf8167e3-fc00-466b-9025-ef5fe0e7fbda',
    kind: 'product',
    comingSoon: true,
  },
];

/**
 * Hub system contacts — not orbs. Used by CEO context and the message bridge
 * when Awad talks to platform leads rather than a company orb.
 */
export const SYSTEM_CONTACTS: LeadContact[] = [
  {
    slug: '_developer',
    leadName: 'Developer Bot',
    agentId: 'dashboard-developer-bot',
    kind: 'system',
  },
  {
    slug: '_dashboard',
    leadName: 'Dashboard Lead',
    agentId: 'dashboard-lead',
    kind: 'system',
  },
];

export const ALL_LEADS: LeadContact[] = [...PRODUCT_LEADS, ...SYSTEM_CONTACTS];

export function getLeadBySlug(slug: string): LeadContact | undefined {
  return ALL_LEADS.find((lead) => lead.slug === slug);
}

export function getLeadByAgentId(agentId: string): LeadContact | undefined {
  return ALL_LEADS.find((lead) => lead.agentId === agentId);
}

export function describeLeadOwnership(): string {
  return PRODUCT_LEADS.map((lead) => {
    const soon = lead.comingSoon ? ' (coming soon)' : '';
    return `${lead.slug} is owned by ${lead.leadName} (${lead.agentId})${soon}`;
  }).join('\n');
}

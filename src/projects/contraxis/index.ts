import { baseMetrics, defineProject, makeAgents, makeNodes, simpleFlow } from '@/projects/factory';

const agents = makeAgents('contraxis', [
  { name: 'CEO Agent', role: 'Lead', objective: 'Steer Contraxis', tools: ['brief', 'approve'] },
  { name: 'Sales Agent', role: 'Sales', objective: 'Win contractor jobs', tools: ['email', 'crm'] },
  { name: 'Lead Generation Agent', role: 'Leads', objective: 'Capture inbound work', tools: ['forms'] },
  { name: 'Marketing Agent', role: 'Marketing', objective: 'Local demand', tools: ['ads'] },
  { name: 'SEO Agent', role: 'SEO', objective: 'Rank service pages', tools: ['search'] },
  { name: 'Customer Support Agent', role: 'Support', objective: 'Keep jobs moving', tools: ['inbox'] },
  { name: 'Analytics Agent', role: 'Analytics', objective: 'Conversion truth', tools: ['metrics'] },
  { name: 'Product Agent', role: 'Product', objective: 'Marketplace UX', tools: ['tickets'] },
  { name: 'Development Agent', role: 'Engineering', objective: 'Ship safely', tools: ['deploy'] },
  { name: 'Research Agent', role: 'Research', objective: 'Trade intel', tools: ['web'] },
]);

const nodes = [
  ...makeNodes('contraxis', [
    { label: 'Contractors', kind: 'source' },
    { label: 'Customers', kind: 'source' },
    { label: 'Leads', kind: 'source' },
    { label: 'CRM', kind: 'system' },
    { label: 'Website', kind: 'system' },
    { label: 'Marketing', kind: 'system' },
    { label: 'Analytics', kind: 'system' },
    { label: 'Revenue', kind: 'sink' },
  ]),
  { id: 'contraxis.node.screen', label: 'Screen', kind: 'screen' as const, position: [0, 3.5, -6] as [number, number, number] },
];

const leadGen = agents.find((a) => a.name.startsWith('Lead'))!;
const sales = agents.find((a) => a.name.startsWith('Sales'))!;
const crm = nodes.find((n) => n.label === 'CRM')!;
const contractors = nodes.find((n) => n.label === 'Contractors')!;
const revenue = nodes.find((n) => n.label === 'Revenue')!;

export const contraxis = defineProject({
  slug: 'contraxis',
  name: 'CONTRAXIS',
  tagline: 'Local lead marketplace for contractors',
  accent: '#3D8BFF',
  universePosition: [6.5, -0.4, 7],
  connections: [
    { to: 'socixis', kind: 'marketing' },
    { to: 'apixis', kind: 'technology' },
  ],
  agents,
  nodes,
  flows: [
    simpleFlow('contraxis.lead-to-revenue', 'Lead to revenue', [
      { id: 'received', label: 'Lead received', atAgentId: leadGen.id },
      { id: 'qualified', label: 'Qualified', atAgentId: leadGen.id },
      { id: 'matched', label: 'Matched', atNodeId: crm.id },
      { id: 'contacted', label: 'Contractor contacted', atAgentId: sales.id },
      { id: 'response', label: 'Response', atNodeId: contractors.id },
      { id: 'won', label: 'Job won', atAgentId: sales.id },
      { id: 'revenue', label: 'Revenue', atNodeId: revenue.id },
    ]),
  ],
  initialMetrics: baseMetrics({
    mrr: 4821,
    arr: 57852,
    revenueToday: 684,
    revenue30d: Array.from({ length: 30 }, (_, i) => 420 + (i % 7) * 40),
    activeUsers: 247,
    newLeads: 82,
    qualifiedLeads: 41,
    jobsWon: 9,
    jobsLost: 3,
    conversionRate: 11.2,
    cac: 38,
    ltv: 640,
    avgLeadValue: 186,
    operatingCosts: 910,
    profit: 3911,
    growthRate: 6.4,
    customers: 118,
    contractors: 64,
  }),
  initialStatus: 'operational',
});

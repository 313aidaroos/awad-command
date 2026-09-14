import { baseMetrics, defineProject, makeAgents, makeNodes, simpleFlow } from '@/projects/factory';

const agents = makeAgents('contraxis', [
  { name: 'CEO Agent', role: 'Lead', objective: 'Steer Contraxis', tools: ['brief', 'approve'], position: [0.2, 0.85, 0.4] },
  { name: 'Sales Agent', role: 'Sales', objective: 'Win contractor jobs', tools: ['email', 'crm'], position: [5.6, 0.85, 0.6] },
  { name: 'Lead Generation Agent', role: 'Leads', objective: 'Capture inbound work', tools: ['forms'], position: [-10.4, 0.85, 0.5] },
  { name: 'Marketing Agent', role: 'Marketing', objective: 'Local demand', tools: ['ads'], position: [-14.2, 0.85, 1.4] },
  { name: 'SEO Agent', role: 'SEO', objective: 'Rank service pages', tools: ['search'], position: [-6.4, 0.85, -0.8] },
  { name: 'Customer Support Agent', role: 'Support', objective: 'Keep jobs moving', tools: ['inbox'], position: [10.4, 0.85, 3.0] },
  { name: 'Analytics Agent', role: 'Analytics', objective: 'Conversion truth', tools: ['metrics'], position: [-2.4, 0.85, 0.5] },
  { name: 'Product Agent', role: 'Product', objective: 'Marketplace UX', tools: ['tickets'], position: [1.6, 0.85, -0.7] },
  { name: 'Development Agent', role: 'Engineering', objective: 'Ship safely', tools: ['deploy'], position: [10.4, 0.85, -3.0] },
  { name: 'Research Agent', role: 'Research', objective: 'Trade intel', tools: ['web'], position: [5.6, 0.85, -1.6] },
]);

const nodes = makeNodes('contraxis', [
  { label: 'Customers', kind: 'source', position: [-14.5, 0.12, 0] },
  { label: 'Lead Gen', kind: 'system', position: [-10.5, 0.12, 0] },
  { label: 'Qualification', kind: 'system', position: [-6.5, 0.12, 0] },
  { label: 'Database', kind: 'system', position: [-2.5, 0.12, 0] },
  { label: 'Matching', kind: 'system', position: [1.5, 0.12, 0] },
  { label: 'Sales', kind: 'system', position: [5.5, 0.12, 0] },
  { label: 'Contractor', kind: 'source', position: [10.5, 0.12, -3.2] },
  { label: 'Job', kind: 'system', position: [10.5, 0.12, 3.2] },
  { label: 'Revenue', kind: 'sink', position: [14.5, 0.12, 0] },
]);

const byLabel = (label: string) => nodes.find((node) => node.label === label);
const leadGen = agents.find((a) => a.name.startsWith('Lead'))!;
const sales = agents.find((a) => a.name.startsWith('Sales'))!;

export const contraxis = defineProject({
  slug: 'contraxis',
  name: 'CONTRAXIS',
  tagline: 'Local lead marketplace for contractors',
  accent: '#3D8BFF',
  universePosition: [7.4, 0, 6.8],
  connections: [
    { to: 'socixis', kind: 'marketing' },
    { to: 'apixis', kind: 'technology' },
  ],
  agents,
  nodes,
  flows: [
    simpleFlow('contraxis.lead-to-revenue', 'Lead to revenue', [
      { id: 'customer', label: 'Customer inbound', atNodeId: byLabel('Customers')?.id },
      { id: 'received', label: 'Lead generated', atAgentId: leadGen.id, atNodeId: byLabel('Lead Gen')?.id },
      { id: 'qualified', label: 'Qualified', atAgentId: leadGen.id, atNodeId: byLabel('Qualification')?.id },
      { id: 'stored', label: 'Written to DB', atNodeId: byLabel('Database')?.id },
      { id: 'matched', label: 'Matched', atNodeId: byLabel('Matching')?.id },
      { id: 'contacted', label: 'Sales engaged', atAgentId: sales.id, atNodeId: byLabel('Sales')?.id },
      { id: 'contractor', label: 'Contractor accepted', atNodeId: byLabel('Contractor')?.id },
      { id: 'job', label: 'Job in progress', atNodeId: byLabel('Job')?.id },
      { id: 'revenue', label: 'Revenue', atNodeId: byLabel('Revenue')?.id },
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

import { baseMetrics, defineProject, makeAgents, makeNodes, simpleFlow } from '@/projects/factory';

const agents = makeAgents('contraxis', [
  { name: 'CEO Agent', role: 'Lead', objective: 'Steer Contraxis', tools: ['brief', 'approve'], position: [0, 2.4, 0] },
  { name: 'Sales Agent', role: 'Sales', objective: 'Win contractor jobs', tools: ['email', 'crm'], position: [4.6, 1.1, 0.2] },
  { name: 'Lead Generation Agent', role: 'Leads', objective: 'Capture inbound work', tools: ['forms'], position: [-5.0, 0.9, 0.5] },
  { name: 'Marketing Agent', role: 'Marketing', objective: 'Local demand', tools: ['ads'], position: [-8.2, 1.6, 1.6] },
  { name: 'SEO Agent', role: 'SEO', objective: 'Rank service pages', tools: ['search'], position: [-2.4, 0.55, -0.6] },
  { name: 'Customer Support Agent', role: 'Support', objective: 'Keep jobs moving', tools: ['inbox'], position: [5.6, -1.1, 2.0] },
  { name: 'Analytics Agent', role: 'Analytics', objective: 'Conversion truth', tools: ['metrics'], position: [0.3, -0.1, 0.4] },
  { name: 'Product Agent', role: 'Product', objective: 'Marketplace UX', tools: ['tickets'], position: [2.3, 0.7, 1.5] },
  { name: 'Development Agent', role: 'Engineering', objective: 'Ship safely', tools: ['deploy'], position: [0.2, -2.6, -2.2] },
  { name: 'Research Agent', role: 'Research', objective: 'Trade intel', tools: ['web'], position: [3.2, 2.5, -2.0] },
]);

const nodes = makeNodes('contraxis', [
  { label: 'Customers', kind: 'source', position: [-8.6, 1.5, 1.9] },
  { label: 'Lead Gen', kind: 'system', position: [-5.2, 0.75, 0.45] },
  { label: 'Qualification', kind: 'system', position: [-2.2, 0.25, -0.85] },
  { label: 'Database', kind: 'system', position: [0.15, -0.45, 0.15] },
  { label: 'Matching', kind: 'system', position: [2.45, 0.45, 1.45] },
  { label: 'Sales', kind: 'system', position: [4.85, 0.95, 0.1] },
  { label: 'Contractor', kind: 'source', position: [7.7, 0.35, -1.55] },
  { label: 'Job', kind: 'system', position: [5.85, -1.35, 2.15] },
  { label: 'Revenue', kind: 'sink', position: [2.15, -2.15, 3.35] },
  { label: 'Screen', kind: 'screen', position: [0, 3.5, -6] },
]);

const byLabel = (label: string) => nodes.find((node) => node.label === label);
const leadGen = agents.find((a) => a.name.startsWith('Lead'))!;
const sales = agents.find((a) => a.name.startsWith('Sales'))!;

export const contraxis = defineProject({
  slug: 'contraxis',
  name: 'CONTRAXIS',
  tagline: 'Local lead marketplace for contractors',
  accent: '#3D8BFF',
  universePosition: [11.2, -0.7, 12.4],
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

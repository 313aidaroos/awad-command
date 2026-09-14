import { baseMetrics, defineProject, makeAgents, makeNodes, simpleFlow } from '@/projects/factory';

const agents = makeAgents('contraxis', [
  { name: 'CEO Agent', role: 'Lead', objective: 'Steer Contraxis', tools: ['brief', 'approve'], position: [8.2, -2.42, 0] },
  { name: 'Sales Agent', role: 'Sales', objective: 'Win contractor jobs', tools: ['email', 'crm'], position: [0, -2.42, 1.05] },
  { name: 'Lead Generation Agent', role: 'Leads', objective: 'Capture inbound work', tools: ['forms'], position: [-7.2, -2.42, 1.05] },
  { name: 'Marketing Agent', role: 'Marketing', objective: 'Local demand', tools: ['ads'], position: [-7.2, -2.42, -1.05] },
  { name: 'SEO Agent', role: 'SEO', objective: 'Rank service pages', tools: ['search'], position: [-3.6, -2.42, -1.05] },
  { name: 'Customer Support Agent', role: 'Support', objective: 'Keep jobs moving', tools: ['inbox'], position: [3.6, -2.42, 1.05] },
  { name: 'Analytics Agent', role: 'Analytics', objective: 'Conversion truth', tools: ['metrics'], position: [-3.6, -2.42, 1.05] },
  { name: 'Product Agent', role: 'Product', objective: 'Marketplace UX', tools: ['tickets'], position: [0, -2.42, -1.05] },
  { name: 'Development Agent', role: 'Engineering', objective: 'Ship safely', tools: ['deploy'], position: [3.6, -2.42, -1.05] },
  { name: 'Research Agent', role: 'Research', objective: 'Trade intel', tools: ['web'], position: [5.4, -2.42, 0] },
]);

const nodes = makeNodes('contraxis', [
  { label: 'Customers', kind: 'source', position: [-7.2, -2.05, -3.25] },
  { label: 'Lead Gen', kind: 'system', position: [-7.2, -2.05, 3.25] },
  { label: 'Qualification', kind: 'system', position: [-3.6, -2.05, -3.25] },
  { label: 'Database', kind: 'system', position: [-3.6, -2.05, 3.25] },
  { label: 'Matching', kind: 'system', position: [0, -2.05, -3.25] },
  { label: 'Sales', kind: 'system', position: [0, -2.05, 3.25] },
  { label: 'Contractor', kind: 'source', position: [3.6, -2.05, -3.25] },
  { label: 'Job', kind: 'system', position: [3.6, -2.05, 3.25] },
  { label: 'Revenue', kind: 'sink', position: [8.35, -1.85, 0] },
]);

const byLabel = (label: string) => nodes.find((node) => node.label === label);
const leadGen = agents.find((a) => a.name.startsWith('Lead'))!;
const sales = agents.find((a) => a.name.startsWith('Sales'))!;

export const contraxis = defineProject({
  slug: 'contraxis',
  name: 'CONTRAXIS',
  tagline: 'Local lead marketplace for contractors',
  accent: '#3D8BFF',
  universePosition: [6.5, -1.84, 2.6],
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

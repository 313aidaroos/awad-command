import { baseMetrics, defineProject, makeAgents, makeNodes, simpleFlow } from '@/projects/factory';

const agents = makeAgents('socixis', [
  { name: 'Content Agent', role: 'Content', objective: 'Draft café posts', tools: ['write'] },
  { name: 'Scheduler Agent', role: 'Ops', objective: 'Time the week', tools: ['calendar'] },
  { name: 'Trend Agent', role: 'Research', objective: 'Spot local trends', tools: ['search'] },
  { name: 'Analytics Agent', role: 'Analytics', objective: 'Measure reach', tools: ['metrics'] },
  { name: 'Reply Agent', role: 'Community', objective: 'Answer guests', tools: ['inbox'] },
]);

const nodes = makeNodes('socixis', [
  { label: 'Briefs', kind: 'source' },
  { label: 'Drafts', kind: 'system' },
  { label: 'Approvals', kind: 'system' },
  { label: 'Channels', kind: 'sink' },
  { label: 'Measure', kind: 'sink' },
]);

export const socixis = defineProject({
  slug: 'socixis',
  name: 'SOCIXIS',
  tagline: 'AI social media for cafés and restaurants',
  accent: '#B48CFF',
  universePosition: [-12.2, 1.4, 10.2],
  connections: [
    { to: 'contraxis', kind: 'marketing' },
    { to: 'publishing', kind: 'publishing' },
  ],
  agents,
  nodes,
  flows: [
    simpleFlow('socixis.publish', 'Brief to measure', [
      { id: 'brief', label: 'Brief', atNodeId: nodes[0]?.id },
      { id: 'draft', label: 'Draft', atAgentId: agents[0]?.id },
      { id: 'approve', label: 'Approve', atNodeId: nodes[2]?.id },
      { id: 'publish', label: 'Publish', atNodeId: nodes[3]?.id },
      { id: 'measure', label: 'Measure', atNodeId: nodes[4]?.id },
    ]),
  ],
  initialMetrics: baseMetrics({
    mrr: 2140,
    arr: 25680,
    revenueToday: 212,
    activeUsers: 96,
    newLeads: 31,
    conversionRate: 7.4,
    customers: 42,
    growthRate: 3.1,
    profit: 980,
  }),
  initialStatus: 'operational',
});

import { baseMetrics, defineProject, makeAgents, makeNodes, simpleFlow } from '@/projects/factory';

const agents = makeAgents('publishing', [
  { name: 'Publishing CEO', role: 'Lead', objective: 'Run the list', tools: ['brief'] },
  { name: 'Research Agent', role: 'Research', objective: 'Find gaps', tools: ['search'] },
  { name: 'Writer Agent', role: 'Writing', objective: 'Draft manuscripts', tools: ['write'] },
  { name: 'Editor Agent', role: 'Edit', objective: 'Tighten copy', tools: ['edit'] },
  { name: 'Cover Agent', role: 'Design', objective: 'Covers that sell', tools: ['image'] },
  { name: 'Marketing Agent', role: 'Marketing', objective: 'KDP ads', tools: ['ads'] },
]);

const nodes = makeNodes('publishing', [
  { label: 'Ideas', kind: 'source' },
  { label: 'Draft', kind: 'system' },
  { label: 'Cover', kind: 'system' },
  { label: 'KDP', kind: 'sink' },
]);

export const publishing = defineProject({
  slug: 'publishing',
  name: 'AWAD PUBLISHING',
  tagline: 'Amazon KDP operation',
  accent: '#F2C14E',
  universePosition: [-11.6, 0, -8.2],
  connections: [{ to: 'socixis', kind: 'publishing' }],
  agents,
  nodes,
  flows: [
    simpleFlow('publishing.kdp', 'Idea to market', [
      { id: 'idea', label: 'Idea', atNodeId: nodes[0]?.id },
      { id: 'draft', label: 'Draft', atAgentId: agents[2]?.id },
      { id: 'edit', label: 'Edit', atAgentId: agents[3]?.id },
      { id: 'cover', label: 'Cover', atAgentId: agents[4]?.id },
      { id: 'publish', label: 'Publish', atNodeId: nodes[3]?.id },
    ]),
  ],
  initialMetrics: baseMetrics({
    mrr: 640,
    revenueToday: 48,
    profit: 210,
  }),
  initialStatus: 'active',
});

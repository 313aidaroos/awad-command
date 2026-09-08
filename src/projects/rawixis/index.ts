import { baseMetrics, defineProject, makeAgents, makeNodes, simpleFlow } from '@/projects/factory';

const agents = makeAgents('rawixis', [
  { name: 'Sourcing Agent', role: 'Sourcing', objective: 'Find suppliers', tools: ['search'] },
  { name: 'Compliance Agent', role: 'Compliance', objective: 'Fail closed', tools: ['review'] },
  { name: 'Research Agent', role: 'Research', objective: 'Track materials', tools: ['notes'] },
  { name: 'Market Agent', role: 'Market', objective: 'Price the book', tools: ['quotes'] },
]);

const nodes = makeNodes('rawixis', [
  { label: 'Suppliers', kind: 'source' },
  { label: 'Checks', kind: 'system' },
  { label: 'Book', kind: 'sink' },
]);

export const rawixis = defineProject({
  slug: 'rawixis',
  name: 'RAWIXIS',
  tagline: 'Critical and rare earth materials marketplace',
  accent: '#C9A66B',
  universePosition: [9, -2.6, -9],
  connections: [],
  agents,
  nodes,
  flows: [
    simpleFlow('rawixis.source', 'Source to book', [
      { id: 'source', label: 'Source', atAgentId: agents[0]?.id },
      { id: 'check', label: 'Compliance', atAgentId: agents[1]?.id },
      { id: 'book', label: 'Book', atNodeId: nodes[2]?.id },
    ]),
  ],
  initialMetrics: baseMetrics({ newLeads: 2 }),
  initialStatus: 'attention',
});

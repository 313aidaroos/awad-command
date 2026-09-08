import { baseMetrics, defineProject, makeAgents, makeNodes, simpleFlow } from '@/projects/factory';

const agents = makeAgents('qahwahworld', [
  { name: 'Host Agent', role: 'Host', objective: 'Keep the room warm', tools: ['chat'] },
  { name: 'Menu Agent', role: 'Menu', objective: 'Seasonal drinks', tools: ['notes'] },
]);

const nodes = makeNodes('qahwahworld', [
  { label: 'Café', kind: 'source' },
  { label: 'Guests', kind: 'sink' },
]);

export const qahwahworld = defineProject({
  slug: 'qahwahworld',
  name: 'QAHWAHWORLD',
  tagline: 'Coffee-house world — coming online',
  accent: '#D4A574',
  universePosition: [-14.1, -4.2, 5.3],
  connections: [{ to: 'socixis', kind: 'marketing' }],
  agents,
  nodes,
  flows: [
    simpleFlow('qahwahworld.host', 'Host the room', [
      { id: 'open', label: 'Open', atNodeId: nodes[0]?.id },
      { id: 'host', label: 'Host', atAgentId: agents[0]?.id },
    ]),
  ],
  initialMetrics: baseMetrics({}),
  initialStatus: 'idle',
  comingSoon: true,
});

import { baseMetrics, defineProject, makeAgents, makeNodes, simpleFlow } from '@/projects/factory';

const agents = makeAgents('apixis', [
  { name: 'Development Agent', role: 'Engineering', objective: 'Build the worlds', tools: ['git'] },
  { name: 'Infra Agent', role: 'Infra', objective: 'Keep clusters quiet', tools: ['deploy'] },
  { name: 'QA Agent', role: 'QA', objective: 'Catch regressions', tools: ['test'] },
  { name: 'Research Agent', role: 'Research', objective: 'Next surfaces', tools: ['notes'] },
]);

const nodes = makeNodes('apixis', [
  { label: 'Repos', kind: 'source' },
  { label: 'Preview', kind: 'system' },
  { label: 'Worlds', kind: 'sink' },
]);

export const apixis = defineProject({
  slug: 'apixis',
  name: 'APIXIS',
  tagline: 'Virtual world platform',
  accent: '#5FD3F3',
  universePosition: [0, 4.4, -18.5],
  connections: [
    { to: 'contraxis', kind: 'technology' },
    { to: 'halaxis', kind: 'data' },
  ],
  agents,
  nodes,
  flows: [
    simpleFlow('apixis.ship', 'Build to world', [
      { id: 'code', label: 'Code', atAgentId: agents[0]?.id },
      { id: 'preview', label: 'Preview', atNodeId: nodes[1]?.id },
      { id: 'live', label: 'World live', atNodeId: nodes[2]?.id },
    ]),
  ],
  initialMetrics: baseMetrics({ activeUsers: 0, growthRate: 0 }),
  initialStatus: 'operational',
});

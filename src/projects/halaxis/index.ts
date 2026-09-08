import { baseMetrics, defineProject, makeAgents, makeNodes, simpleFlow } from '@/projects/factory';

const agents = makeAgents('halaxis', [
  { name: 'Research Agent', role: 'Research', objective: 'Map halal verticals', tools: ['research'] },
  { name: 'Outreach Agent', role: 'Outreach', objective: 'Open conversations', tools: ['email'] },
  { name: 'Analytics Agent', role: 'Analytics', objective: 'Score ventures', tools: ['metrics'] },
  { name: 'Compliance Agent', role: 'Compliance', objective: 'Keep the screen clean', tools: ['review'] },
]);

const nodes = makeNodes('halaxis', [
  { label: 'Sectors', kind: 'source' },
  { label: 'Pipeline', kind: 'system' },
  { label: 'Ventures', kind: 'sink' },
]);

export const halaxis = defineProject({
  slug: 'halaxis',
  name: 'HALAXIS',
  tagline: 'Halal and high-value industry ventures',
  accent: '#4FC3A1',
  universePosition: [-9.4, 0, 1.2],
  connections: [{ to: 'apixis', kind: 'data' }],
  agents,
  nodes,
  flows: [
    simpleFlow('halaxis.venture', 'Research to venture', [
      { id: 'scan', label: 'Scan', atAgentId: agents[0]?.id },
      { id: 'outreach', label: 'Outreach', atAgentId: agents[1]?.id },
      { id: 'venture', label: 'Venture', atNodeId: nodes[2]?.id },
    ]),
  ],
  initialMetrics: baseMetrics({ newLeads: 4 }),
  initialStatus: 'active',
});

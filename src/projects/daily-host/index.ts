import { baseMetrics, defineProject, makeAgents, makeNodes, simpleFlow } from '@/projects/factory';

const agents = makeAgents('daily-host', [
  { name: 'Research Agent', role: 'Research', objective: 'Find and verify today’s strongest story', tools: ['sources'] },
  { name: 'Script Agent', role: 'Writing', objective: 'Write a concise daily episode', tools: ['writer'] },
  { name: 'Media Agent', role: 'Production', objective: 'Compose voice, avatar, visuals, and captions', tools: ['media'] },
  { name: 'QC Agent', role: 'Safety', objective: 'Block unverified or broken episodes', tools: ['quality'] },
  { name: 'Publisher Agent', role: 'Distribution', objective: 'Publish only approved episodes', tools: ['social'] },
]);

const nodes = makeNodes('daily-host', [
  { label: 'Sources', kind: 'source' },
  { label: 'Episode', kind: 'system' },
  { label: 'Preview', kind: 'system' },
  { label: 'Social', kind: 'sink' },
]);

export const dailyHost = defineProject({
  slug: 'daily-host',
  name: 'DAILY AI HOST',
  tagline: 'Autonomous short-form media',
  accent: '#3D8BFF',
  universePosition: [0, -12.5, -2.8],
  connections: [
    { to: 'studios', kind: 'technology' },
    { to: 'socixis', kind: 'publishing' },
  ],
  agents,
  nodes,
  flows: [
    simpleFlow('daily-host.episode', 'Research to publishing', [
      { id: 'research', label: 'Research', atAgentId: agents[0]?.id },
      { id: 'script', label: 'Script', atAgentId: agents[1]?.id },
      { id: 'media', label: 'Media', atAgentId: agents[2]?.id },
      { id: 'qc', label: 'QC', atAgentId: agents[3]?.id },
      { id: 'publish', label: 'Publish', atNodeId: nodes[3]?.id },
    ]),
  ],
  initialMetrics: baseMetrics({ activeUsers: 1 }),
  initialStatus: 'operational',
  analyticsKeys: ['activeUsers'],
});

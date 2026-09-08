import { baseMetrics, defineProject, makeAgents, makeNodes, simpleFlow } from '@/projects/factory';

const agents = makeAgents('lyrixis', [
  { name: 'Lyric Agent', role: 'Writing', objective: 'Draft verses', tools: ['write'] },
  { name: 'Melody Agent', role: 'Melody', objective: 'Sketch hooks', tools: ['audio'] },
  { name: 'Catalog Agent', role: 'Catalog', objective: 'Keep songs findable', tools: ['index'] },
]);

const nodes = makeNodes('lyrixis', [
  { label: 'Ideas', kind: 'source' },
  { label: 'Studio', kind: 'system' },
  { label: 'Catalog', kind: 'sink' },
]);

export const lyrixis = defineProject({
  slug: 'lyrixis',
  name: 'LYRIXIS',
  tagline: 'Lyrics and song platform',
  accent: '#8CA6FF',
  universePosition: [-5.2, -1.1, -23.0],
  connections: [],
  agents,
  nodes,
  flows: [
    simpleFlow('lyrixis.write', 'Idea to catalog', [
      { id: 'idea', label: 'Idea', atNodeId: nodes[0]?.id },
      { id: 'lyric', label: 'Lyric', atAgentId: agents[0]?.id },
      { id: 'catalog', label: 'Catalog', atNodeId: nodes[2]?.id },
    ]),
  ],
  initialMetrics: baseMetrics({}),
  initialStatus: 'idle',
});

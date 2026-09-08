import { baseMetrics, defineProject, makeAgents, makeNodes, simpleFlow } from '@/projects/factory';

const agents = makeAgents('nursery-toons', [
  { name: 'Story Agent', role: 'Story', objective: 'Gentle plots', tools: ['write'] },
  { name: 'Toon Agent', role: 'Art', objective: 'Character sheets', tools: ['image'] },
]);

const nodes = makeNodes('nursery-toons', [
  { label: 'Stories', kind: 'source' },
  { label: 'Toons', kind: 'sink' },
]);

export const nurseryToons = defineProject({
  slug: 'nursery-toons',
  name: 'NURSERY TOONS',
  tagline: 'Children’s toon studio — coming online',
  accent: '#FFB86B',
  universePosition: [11.2, 0, 5.4],
  connections: [{ to: 'studios', kind: 'publishing' }],
  agents,
  nodes,
  flows: [
    simpleFlow('nursery-toons.story', 'Story to toon', [
      { id: 'story', label: 'Story', atAgentId: agents[0]?.id },
      { id: 'toon', label: 'Toon', atNodeId: nodes[1]?.id },
    ]),
  ],
  initialMetrics: baseMetrics({}),
  initialStatus: 'idle',
  comingSoon: true,
});

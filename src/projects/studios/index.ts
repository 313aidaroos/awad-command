import { baseMetrics, defineProject, makeAgents, makeNodes, simpleFlow } from '@/projects/factory';

const agents = makeAgents('studios', [
  { name: 'Idea Agent', role: 'Ideas', objective: 'Find the show', tools: ['notes'] },
  { name: 'Story Agent', role: 'Story', objective: 'Hold the spine', tools: ['write'] },
  { name: 'Script Agent', role: 'Script', objective: 'Write scenes', tools: ['write'] },
  { name: 'Director Agent', role: 'Direction', objective: 'Lock the look', tools: ['review'] },
  { name: 'Animation Agent', role: 'Animation', objective: 'Move the frames', tools: ['render'] },
  { name: 'Editor Agent', role: 'Edit', objective: 'Cut the piece', tools: ['edit'] },
]);

const nodes = makeNodes('studios', [
  { label: 'Bible', kind: 'source' },
  { label: 'Scenes', kind: 'system' },
  { label: 'Cut', kind: 'sink' },
]);

export const studios = defineProject({
  slug: 'studios',
  name: 'AWAD STUDIOS',
  tagline: 'Entertainment and show production',
  accent: '#FF7A93',
  universePosition: [11, 1.6, -3],
  connections: [{ to: 'socixis', kind: 'publishing' }],
  agents,
  nodes,
  flows: [
    simpleFlow('studios.produce', 'Idea to release', [
      { id: 'idea', label: 'Idea', atAgentId: agents[0]?.id },
      { id: 'story', label: 'Story', atAgentId: agents[1]?.id },
      { id: 'script', label: 'Script', atAgentId: agents[2]?.id },
      { id: 'anim', label: 'Animation', atAgentId: agents[4]?.id },
      { id: 'cut', label: 'Cut', atNodeId: nodes[2]?.id },
    ]),
  ],
  initialMetrics: baseMetrics({}),
  initialStatus: 'active',
});

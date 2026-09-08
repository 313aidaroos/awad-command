import { baseMetrics, defineProject, makeAgents, makeNodes, simpleFlow } from '@/projects/factory';

const agents = makeAgents('awadbot', [
  { name: 'Market Analyst', role: 'Markets', objective: 'Read the tape', tools: ['quotes'] },
  { name: 'News Analyst', role: 'News', objective: 'Score headlines', tools: ['rss'] },
  { name: 'Technical Analyst', role: 'Technicals', objective: 'Chart structure', tools: ['charts'] },
  { name: 'Risk Manager', role: 'Risk', objective: 'Cap paper loss', tools: ['risk'] },
  { name: 'Portfolio Manager', role: 'Portfolio', objective: 'Simulate allocations', tools: ['paper'] },
]);

const nodes = makeNodes('awadbot', [
  { label: 'Market Data', kind: 'source' },
  { label: 'News', kind: 'source' },
  { label: 'Paper Portfolio', kind: 'sink' },
  { label: 'Risk Model', kind: 'system' },
]);

export const awadbot = defineProject({
  slug: 'awadbot',
  name: 'AWADBOT',
  tagline: 'Personal financial AI · paper portfolio only',
  accent: '#6FE3B4',
  universePosition: [0.5, -2.2, 10.5],
  connections: [],
  agents,
  nodes,
  flows: [
    simpleFlow('awadbot.analysis-to-trade', 'Analysis to paper trade', [
      { id: 'signal', label: 'Signal', atAgentId: agents[0]?.id },
      { id: 'debate', label: 'Debate', atAgentId: agents[1]?.id },
      { id: 'risk', label: 'Risk check', atNodeId: nodes[3]?.id },
      { id: 'sim', label: 'Simulated trade', atAgentId: agents[4]?.id },
      { id: 'book', label: 'Portfolio update', atNodeId: nodes[2]?.id },
    ]),
  ],
  initialMetrics: baseMetrics({
    revenueToday: 1284,
    conversionRate: 61,
    paperPortfolio: 100000,
    todayPnl: 1284,
    todayPct: 1.28,
    aiConfidence: 0.72,
  }),
  initialStatus: 'active',
});

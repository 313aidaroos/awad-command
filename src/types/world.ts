export type WorldNodeKind = 'source' | 'system' | 'sink' | 'screen';

export interface WorldNode {
  id: string;
  label: string;
  kind: WorldNodeKind;
  position: [number, number, number];
}

export interface FlowStage {
  id: string;
  label: string;
  atNodeId?: string;
  atAgentId?: string;
  durationMs: number;
}

export interface Flow {
  id: string;
  label: string;
  stages: FlowStage[];
}

export interface FlowInstance {
  flowId: string;
  projectSlug: string;
  stageIndex: number;
  startedAt: number;
  stageStartedAt: number;
}

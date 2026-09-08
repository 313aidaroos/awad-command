import type { AgentState } from '@/types/agent';
import type { Approval, LeadMessage } from '@/types/approval';
import type { CommandEvent } from '@/types/events';
import type { ProjectRuntime } from '@/types/project';
import type { FlowInstance } from '@/types/world';

export type ViewName = 'boot' | 'universe' | 'project' | 'agent' | 'ceo';
export type ModeName = 'default' | 'economy' | 'workforce' | 'analytics';
export type DataMode = 'demo' | 'live';
export type QualityLevel = 'high' | 'medium' | 'low';
export type ContextPanel =
  | 'none'
  | 'agent'
  | 'analytics'
  | 'briefing'
  | 'approval'
  | 'computer'
  | 'lead';

export interface CameraTarget {
  position: [number, number, number];
  lookAt: [number, number, number];
  duration: number;
}

export interface CommandState {
  view: ViewName;
  mode: ModeName;
  focusedProject?: string;
  focusedAgent?: string;
  hoveredProject?: string;
  dataMode: DataMode;
  booted: boolean;
  camera: { target: CameraTarget | null; requestId: number };
  projects: Record<string, ProjectRuntime>;
  agents: Record<string, AgentState>;
  flows: Record<string, FlowInstance>;
  events: { buffer: CommandEvent[]; unread: number };
  paletteOpen: boolean;
  eventStreamOpen: boolean;
  newsOpen: boolean;
  contextPanel: ContextPanel;
  briefingSeen: boolean;
  approvals: Approval[];
  leadMessages: LeadMessage[];
  voiceMuted: boolean;
  quality: { level: QualityLevel; auto: boolean };
}

export interface CommandActions {
  initFromRegistry: () => void;
  finishBoot: () => void;
  enterProject: (slug: string) => void;
  enterAgent: (id: string) => void;
  returnToUniverse: () => void;
  setMode: (mode: ModeName) => void;
  hoverProject: (slug: string | undefined) => void;
  flyTo: (target: CameraTarget) => void;
  openPanel: (kind: ContextPanel) => void;
  closePanel: () => void;
  togglePalette: (open?: boolean) => void;
  toggleNews: (open?: boolean) => void;
  toggleEventStream: (open?: boolean) => void;
  setQuality: (level: QualityLevel, auto?: boolean) => void;
  applyEvent: (event: CommandEvent) => void;
  requestApproval: (approval: Omit<Approval, 'id' | 'status' | 'createdAt'>) => string;
  resolveApproval: (id: string, decision: 'approved' | 'denied') => void;
  queueLeadMessage: (message: LeadMessage) => void;
  setBriefingSeen: (seen: boolean) => void;
  setVoiceMuted: (muted: boolean) => void;
  tick: (dt: number) => void;
}

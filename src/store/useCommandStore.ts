import { create } from 'zustand';
import { applyEventToState } from '@/data/reducers';
import { uid } from '@/lib/ids';
import { getProject, projects } from '@/projects/registry';
import type { CommandActions, CommandState } from '@/store/types';
import type { AgentStatus } from '@/types/agent';
import type { Approval } from '@/types/approval';

const UNIVERSE_CAM: CommandState['camera']['target'] = {
  position: [0, 4, 22],
  lookAt: [0, 0, 0],
  duration: 1.4,
};

function initialAgentStatus(slug: string): AgentStatus {
  if (slug === 'rawixis') return 'needs_approval';
  if (slug === 'lyrixis' || slug === 'nursery-toons' || slug === 'qahwahworld') return 'idle';
  return 'working';
}

export const useCommandStore = create<CommandState & CommandActions>((set, get) => ({
  view: 'boot',
  mode: 'default',
  dataMode: 'demo',
  booted: false,
  camera: { target: null, requestId: 0 },
  projects: {},
  agents: {},
  flows: {},
  events: { buffer: [], unread: 0 },
  paletteOpen: false,
  eventStreamOpen: true,
  newsOpen: true,
  contextPanel: 'none',
  briefingSeen: false,
  approvals: [],
  leadMessages: [],
  voiceMuted: false,
  quality: { level: 'low', auto: true },

  initFromRegistry: () =>
    set((state) => {
      if (Object.keys(state.projects).length > 0) return state;
      const nextProjects: CommandState['projects'] = {};
      const nextAgents: CommandState['agents'] = {};
      for (const project of projects) {
        nextProjects[project.slug] = {
          status: project.initialStatus,
          metrics: { ...project.initialMetrics, revenue30d: [...project.initialMetrics.revenue30d] },
          activity: project.initialStatus === 'idle' ? 0.15 : project.initialStatus === 'attention' ? 0.4 : 0.55,
          lastEventTs: 0,
        };
        for (const agent of project.agents) {
          nextAgents[agent.id] = {
            id: agent.id,
            status: initialAgentStatus(project.slug),
            completedToday: project.comingSoon ? 0 : Math.floor(Math.random() * 6),
            successRate: 0.72,
            activeSince: Date.now() - 3_600_000,
            recentActions: [],
            stats: {},
          };
        }
      }
      return { ...state, projects: nextProjects, agents: nextAgents };
    }),

  finishBoot: () => {
    if (get().booted) return;
    set({
      booted: true,
      view: 'universe',
      camera: { target: UNIVERSE_CAM, requestId: get().camera.requestId + 1 },
    });
  },

  enterProject: (slug) => {
    const project = getProject(slug);
    if (!project) return;
    const [x, y, z] = project.universePosition;
    const len = Math.max(0.001, Math.hypot(x, y, z));
    get().flyTo({
      position: [x + (x / len) * 6, y + 1.2, z + (z / len) * 6],
      lookAt: [x, y, z],
      duration: 1.4,
    });
    set({
      view: 'project',
      focusedProject: slug,
      focusedAgent: undefined,
      contextPanel: 'lead',
    });
  },

  enterAgent: (id) => set({ view: 'agent', focusedAgent: id, contextPanel: 'agent' }),

  returnToUniverse: () => {
    get().flyTo(UNIVERSE_CAM);
    set({
      view: 'universe',
      focusedProject: undefined,
      focusedAgent: undefined,
      contextPanel: 'none',
      mode: 'default',
    });
  },

  setMode: (mode) => set({ mode, contextPanel: mode === 'analytics' ? 'analytics' : get().contextPanel }),
  hoverProject: (slug) => set({ hoveredProject: slug }),
  flyTo: (target) =>
    set((state) => ({ camera: { target, requestId: state.camera.requestId + 1 } })),
  openPanel: (kind) => set({ contextPanel: kind }),
  closePanel: () => set({ contextPanel: 'none' }),
  togglePalette: (open) => set({ paletteOpen: open ?? !get().paletteOpen }),
  toggleNews: (open) => set({ newsOpen: open ?? !get().newsOpen }),
  toggleEventStream: (open) => set({ eventStreamOpen: open ?? !get().eventStreamOpen }),
  setQuality: (level, auto = false) =>
    set((state) =>
      state.quality.level === level && state.quality.auto === auto ? state : { quality: { level, auto } },
    ),
  applyEvent: (event) =>
    set((state) => {
      const next = {
        ...state,
        projects: { ...state.projects },
        agents: { ...state.agents },
        flows: { ...state.flows },
        events: { ...state.events, buffer: [...state.events.buffer] },
      };
      for (const [slug, runtime] of Object.entries(next.projects)) {
        next.projects[slug] = { ...runtime, metrics: { ...runtime.metrics } };
      }
      for (const [id, agent] of Object.entries(next.agents)) {
        next.agents[id] = { ...agent, recentActions: [...agent.recentActions] };
      }
      applyEventToState(next, event);
      return next;
    }),
  requestApproval: (approval) => {
    const record: Approval = {
      ...approval,
      id: uid('apr'),
      status: 'pending',
      createdAt: Date.now(),
    };
    set((state) => ({
      approvals: [record, ...state.approvals],
      contextPanel: 'approval',
    }));
    return record.id;
  },
  resolveApproval: (id, decision) =>
    set((state) => ({
      approvals: state.approvals.map((item) =>
        item.id === id
          ? { ...item, status: decision, resolvedAt: Date.now(), resolvedBy: 'Awad' }
          : item,
      ),
    })),
  queueLeadMessage: (message) =>
    set((state) => ({ leadMessages: [message, ...state.leadMessages].slice(0, 80) })),
  mergeLeadMessages: (messages) =>
    set((state) => {
      if (messages.length === 0) return state;
      const byId = new Map(state.leadMessages.map((item) => [item.id, item]));
      for (const item of messages) byId.set(item.id, item);
      const leadMessages = [...byId.values()].sort((a, b) => b.ts - a.ts).slice(0, 80);
      return { leadMessages };
    }),
  setBriefingSeen: (seen) => set({ briefingSeen: seen }),
  setVoiceMuted: (muted) => set({ voiceMuted: muted }),
  tick: (dt) =>
    set((state) => {
      if (!state.booted) return state;
      let changed = false;
      const projectsNext: CommandState['projects'] = { ...state.projects };
      for (const [slug, runtime] of Object.entries(projectsNext)) {
        const floor = runtime.status === 'idle' ? 0.12 : 0.15;
        const activity = Math.max(floor, runtime.activity - 0.03 * dt);
        if (Math.abs(activity - runtime.activity) < 0.0008) continue;
        projectsNext[slug] = { ...runtime, activity };
        changed = true;
      }
      return changed ? { projects: projectsNext } : state;
    }),
}));

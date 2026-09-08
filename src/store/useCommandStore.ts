import { create } from 'zustand';
import { applyEventToState } from '@/data/reducers';
import { uid } from '@/lib/ids';
import { getProject, projects } from '@/projects/registry';
import { projectEnterSequence, projectInteriorCam, UNIVERSE_CAM } from '@/scene/lib/cameraPaths';
import type { CameraTarget, CommandActions, CommandState } from '@/store/types';
import type { AgentStatus } from '@/types/agent';
import type { Approval } from '@/types/approval';

function initialAgentStatus(slug: string): AgentStatus {
  if (slug === 'rawixis') return 'needs_approval';
  if (slug === 'lyrixis' || slug === 'nursery-toons' || slug === 'qahwahworld') return 'idle';
  return 'working';
}

function findAgentProject(id: string): string | undefined {
  return projects.find((project) => project.agents.some((agent) => agent.id === id))?.slug;
}

function cameraFrom(targets: CameraTarget[], requestId: number): CommandState['camera'] {
  const sequence = targets.length > 0 ? targets : [UNIVERSE_CAM];
  return { sequence, index: 0, target: sequence[0] ?? null, requestId };
}

export const useCommandStore = create<CommandState & CommandActions>((set, get) => ({
  view: 'boot',
  mode: 'default',
  enterPhase: 'universe',
  dataMode: 'demo',
  booted: false,
  camera: { target: UNIVERSE_CAM, sequence: [UNIVERSE_CAM], index: 0, requestId: 1 },
  projects: {},
  agents: {},
  flows: {},
  events: { buffer: [], unread: 0 },
  paletteOpen: false,
  eventStreamOpen: false,
  newsOpen: false,
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
      enterPhase: 'universe',
    });
  },

  enterProject: (slug) => {
    const project = getProject(slug);
    if (!project) return;
    const sequence = projectEnterSequence(project.universePosition);
    set({
      view: 'project',
      focusedProject: slug,
      focusedAgent: undefined,
      followingAgent: undefined,
      enterPhase: 'approach',
      contextPanel: 'none',
      camera: cameraFrom(sequence, get().camera.requestId + 1),
    });
  },

  enterAgent: (id) => get().followAgent(id),

  followAgent: (id) => {
    const slug = findAgentProject(id) ?? get().focusedProject;
    if (!slug || !get().agents[id]) return;
    set({
      view: 'agent',
      focusedProject: slug,
      focusedAgent: id,
      followingAgent: id,
      contextPanel: 'agent',
    });
  },

  stopFollow: () => {
    const slug = get().focusedProject;
    const project = slug ? getProject(slug) : undefined;
    if (!project) {
      get().returnToUniverse();
      return;
    }
    set({
      view: 'project',
      focusedAgent: undefined,
      followingAgent: undefined,
      contextPanel: 'none',
      enterPhase: 'interior',
      camera: cameraFrom([projectInteriorCam(project.universePosition)], get().camera.requestId + 1),
    });
  },

  returnToUniverse: () => {
    set({
      view: 'universe',
      focusedProject: undefined,
      focusedAgent: undefined,
      followingAgent: undefined,
      enterPhase: 'universe',
      contextPanel: 'none',
      mode: 'default',
      camera: cameraFrom([UNIVERSE_CAM], get().camera.requestId + 1),
    });
  },

  setMode: (mode) => set({ mode, contextPanel: mode === 'analytics' ? 'analytics' : get().contextPanel }),
  hoverProject: (slug) => set({ hoveredProject: slug }),
  flyTo: (target) =>
    set((state) => ({
      camera: cameraFrom([target], state.camera.requestId + 1),
      enterPhase: target.phase ?? state.enterPhase,
    })),
  flySequence: (targets) =>
    set((state) => ({
      camera: cameraFrom(targets, state.camera.requestId + 1),
      enterPhase: targets[0]?.phase ?? state.enterPhase,
    })),
  advanceCamera: () =>
    set((state) => {
      const nextIndex = state.camera.index + 1;
      const next = state.camera.sequence[nextIndex];
      if (!next) return state;
      return {
        camera: {
          ...state.camera,
          index: nextIndex,
          target: next,
          requestId: state.camera.requestId + 1,
        },
        enterPhase: next.phase ?? state.enterPhase,
      };
    }),
  setEnterPhase: (phase) => set({ enterPhase: phase }),
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

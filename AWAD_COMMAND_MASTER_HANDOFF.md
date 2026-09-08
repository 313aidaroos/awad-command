# AWAD COMMAND — Master Handoff

**One document for everyone building or advising on AWAD COMMAND.**
Owner: Awad (Apixis Dev). Audience: the developer, Cursor, and any AI assistant (Grok, Claude, etc.).
Version: 1.0 · September 2026

## Read this first (2 minutes)

AWAD COMMAND is a private, login-protected website where Awad walks into a 3D universe of his businesses, watches AI agents work, asks one master AI (the CEO) what's happening, and tells agents to do things — which they actually do, then report back.

It is built in four parts, in this order:

| Part | What it delivers | Who does it | Where in this doc |
|---|---|---|---|
| A | The 3D universe, Contraxis world, CEO chat, morning briefing, news corner — running on **demo data** | Cursor, step by step | Sections 1–11 |
| B | Login, the real database (Supabase), live events | Developer | Sections 8–9 |
| C | The **worker** that runs agents 24/7, the task/approval loop, first integrations (email, deploy, Stripe, Contraxis) | Developer + Cursor | Part C |
| D | The agents' **own computer** (browser, files, scripts, live screen view) | Developer | Part D |

Part E has notes for each audience. Appendix A is Awad's original vision, unchanged — the source of truth for how it should *feel*.

Hard rules that apply everywhere:
1. The 3D universe is the interface. Never a card grid or admin panel.
2. Every number on screen is either real or clearly tagged **demo**. Never pretend.
3. Agents never spend money, publish publicly, delete, or trade with real money without a human tapping **Approve**. There is no real-money trading path at all.
4. Secrets live only on servers. Awad never pastes keys into chat tools.

A working preview of the visual direction ships alongside this file as `awad-command-preview.html` (open it in a browser). It is a mood reference, not code to reuse.

---

# PART A & B — Build plan (Phase 1 demo, then Phase 2 data layer)

A step-by-step plan for building the 3D AI command center with Cursor (or a developer). It is written so each step can be pasted into Cursor as a single prompt, checked, committed, and then followed by the next.

---

## 1. How to use this document

1. Create a new empty folder called `awad-command` and open it in Cursor.
2. Copy the contents of **Section 3 (Cursor rules)** into a file at `.cursor/rules/awad-command.mdc`. Cursor will read it on every request so you never have to repeat the design rules.
3. Work through **Section 7 (Build prompts)** in order. Paste one prompt at a time into Cursor's Agent mode. Do not skip ahead — every prompt assumes the previous one is done.
4. After each prompt, run the **Check** list under it. If something fails, paste the error back into Cursor and say "fix this, do not change anything else."
5. Commit after each passing step (`git add -A && git commit -m "step N: ..."`). If a later step breaks things you can always go back.
6. Phase 1 is roughly 18 prompts. Expect 2–4 Cursor turns per prompt on average. Steps 9–11 (the Contraxis world) and 14 (CEO) are the heaviest.

Each prompt is self-contained: it tells Cursor which files to touch, what "done" looks like, and what not to do. The original vision document is still useful as reference — keep it in the repo at `docs/VISION.md` so Cursor can read it when a prompt says so.

---

## 2. Decisions locked in before building

These are made now so Cursor doesn't reinvent them on every step.

| Area | Decision | Why |
|---|---|---|
| Framework | Next.js 15 (App Router), TypeScript strict, `src/` directory | Requested stack; App Router gives server routes for secrets |
| 3D | three + @react-three/fiber + @react-three/drei + @react-three/postprocessing | Standard R3F stack, no custom engine |
| State | Zustand (one store: `useCommandStore`) | Lightweight, works inside and outside the R3F canvas |
| Animation | Framer Motion for 2D HTML overlays only. Camera and 3D motion use `useFrame` + damping (drei `easing` / `maath`) | Two animation systems on the same object cause fights |
| Styling | Tailwind 4 + a small set of CSS variables for design tokens | Requested |
| Data | Every screen reads from the Zustand store. The store is fed by an `EventSource` interface. Phase 1 uses `DemoEventSource`; Phase 2 swaps in `SupabaseEventSource` | The visuals are driven by events from day one, so real data plugs in without a rewrite |
| Projects | Each project is a folder under `src/projects/<slug>/` exporting one `ProjectDefinition` object. A registry file lists them. Adding a project = adding a folder + one line | Requested plug-in architecture |
| Worlds | One generic `ProjectWorld` renderer that reads the `ProjectDefinition` (agents, nodes, flows). Contraxis gets extra custom pieces; the other worlds get the generic renderer with their own config | Contraxis stays the showcase without every world being handwritten |
| CEO | Next.js route handler `/api/ceo` calling the Anthropic API server-side. The current store snapshot is sent as context. If no API key is set, a rule-based demo responder answers instead | Key never reaches the browser; demo works with zero credentials |
| Voice | Browser Web Speech API (`SpeechRecognition` for input, `speechSynthesis` for output). No third-party voice service in Phase 1 | Free, no keys, works in Chrome and Safari |
| Demo labelling | A global `dataMode: 'demo' \| 'live'` flag in the store. Every number rendered goes through a `<Metric>` component that shows a small `DEMO` tag when in demo mode | One place to enforce "never pretend demo numbers are real" |
| Auth | Supabase Auth with email magic link, single allowed email in an env var. Added in Phase 2. Phase 1 has no auth (local only) | Requested |

Package versions to pin (tell Cursor to use these or newer compatible):
`next@15`, `react@19`, `three@^0.170`, `@react-three/fiber@^9`, `@react-three/drei@^10`, `@react-three/postprocessing@^3`, `zustand@^5`, `framer-motion@^12`, `maath`, `tailwindcss@^4`, `@supabase/supabase-js@^2`, `@supabase/ssr`, `@anthropic-ai/sdk`, `cmdk`, `lucide-react`, `zod`.

---

## 3. Cursor rules — paste into `.cursor/rules/awad-command.mdc`

```
---
description: AWAD COMMAND project rules — always apply
alwaysApply: true
---

You are building AWAD COMMAND, a private 3D AI command center for one user (Awad).
Read docs/VISION.md and docs/BUILD_PLAN.md before large changes.

## Non-negotiables
- The home screen is a 3D universe rendered with React Three Fiber. Never replace it with a card grid, sidebar dashboard, or list view.
- Navigation is camera movement. Clicking an orb flies the camera; it never opens a modal or routes to a new page. Panels are translucent overlays on top of the persistent canvas.
- Every visual (particles, agent movement, flows) is driven by store state, which is driven by events from an EventSource. Never animate business activity from random timers inside a component.
- All displayed business numbers go through the <Metric> component. In demo mode they carry the DEMO tag. Never hardcode a number into JSX.
- Never put secrets in client code. Anthropic and Supabase service keys live only in route handlers and server code. NEXT_PUBLIC_ vars are for the anon key and URL only.
- No real-money trading, no destructive agent actions without an approval record.

## Architecture
- One Zustand store: src/store/useCommandStore.ts. Slices: view, camera, projects, agents, events, ui, quality.
- Projects are plug-ins: src/projects/<slug>/index.ts exports a ProjectDefinition. src/projects/registry.ts lists them. Nothing else should hardcode project names.
- Camera moves are requested through store actions (flyTo, returnToUniverse). CameraRig is the only component that touches the camera.
- 3D code lives in src/scene. 2D overlay code lives in src/ui. They communicate only through the store.
- Keep files under ~250 lines. Split when larger.

## Visual language
- Palette: base #07080A (void), #0E1013 (graphite), #171A1F (glass fill), #E6E8EC (silver text), #8A909A (muted), accent #3D8BFF (electric blue). Project accents are defined per ProjectDefinition and used sparingly.
- Typography: Inter Tight for UI, Geist Mono only for numbers/timestamps. Sentence case everywhere. No all-caps labels except project names in the 3D scene.
- Glass panels: rgba(23,26,31,0.55), backdrop-blur 18px, 1px border rgba(255,255,255,0.08), radius 14px. Shadows are soft and dark, not glowing.
- Restraint over spectacle: bloom intensity ≤ 0.9, particles never more than ~6k on HIGH, motion is slow (damping 0.15–0.35). If it looks like a crypto dashboard or a game HUD, pull back.
- Status colours: operational #3D8BFF, active #6FE3B4 (soft), idle #5B616B, attention #F2C14E, warning #F2994A, error #E5533D, offline #3A3E45. Status shows as a thin ring/tint, never a health bar.

## Quality bar for each step
- `pnpm typecheck` and `pnpm lint` pass.
- `pnpm dev` runs with no console errors.
- Runs at 60fps on a MacBook in HIGH quality; does not exceed ~20ms frame time in MEDIUM.
- Do exactly what the prompt asks. Do not add features from later steps early.
```

---

## 4. File structure (target for end of Phase 1)

```
awad-command/
├── .cursor/rules/awad-command.mdc
├── .env.local.example
├── docs/
│   ├── VISION.md                  # original vision document
│   └── BUILD_PLAN.md              # this file
├── public/fonts/                  # Inter Tight, Geist Mono (self-hosted)
├── supabase/                      # Phase 2
│   └── migrations/
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx               # mounts <CommandShell/>
    │   ├── globals.css            # tokens + tailwind
    │   └── api/
    │       └── ceo/route.ts       # server-side Anthropic call (step 14)
    │
    ├── types/
    │   ├── project.ts             # ProjectDefinition, ProjectStatus, Metrics
    │   ├── agent.ts               # AgentDefinition, AgentStatus, AgentAction
    │   ├── events.ts              # CommandEvent union, EventType enum
    │   └── world.ts               # WorldNode, Flow, FlowStage
    │
    ├── projects/
    │   ├── registry.ts            # export const projects: ProjectDefinition[]
    │   ├── contraxis/
    │   │   ├── index.ts           # definition (colour, agents, nodes, flows, metrics)
    │   │   ├── demo.ts            # demo simulator for this project
    │   │   └── world/             # custom 3D pieces for Contraxis only
    │   ├── awadbot/
    │   │   ├── index.ts
    │   │   └── demo.ts
    │   ├── publishing/
    │   ├── studios/
    │   ├── apixis/
    │   ├── lyrixis/
    │   ├── halaxis/
    │   ├── rawixis/
    │   └── socixis/
    │
    ├── data/
    │   ├── EventSource.ts         # interface
    │   ├── DemoEventSource.ts     # runs every project's demo.ts on a clock
    │   ├── SupabaseEventSource.ts # Phase 2
    │   └── reducers.ts            # event → store state updates
    │
    ├── store/
    │   ├── useCommandStore.ts
    │   └── slices/
    │       ├── view.ts            # view, mode, focused ids
    │       ├── camera.ts          # camera target queue
    │       ├── projects.ts
    │       ├── agents.ts
    │       ├── events.ts          # ring buffer of last 500 events
    │       ├── ui.ts              # panels open, palette open, briefing seen
    │       └── quality.ts
    │
    ├── scene/
    │   ├── CommandCanvas.tsx      # <Canvas> + quality + postprocessing
    │   ├── CameraRig.tsx          # reads camera slice, eases camera
    │   ├── Environment/
    │   │   ├── Starfield.tsx
    │   │   ├── Lighting.tsx
    │   │   └── Effects.tsx        # bloom, vignette, per quality level
    │   ├── universe/
    │   │   ├── Universe.tsx       # lays out orbs from registry
    │   │   ├── ProjectOrb.tsx
    │   │   ├── OrbCore.tsx        # shader sphere
    │   │   ├── OrbParticles.tsx   # internal + orbiting
    │   │   ├── OrbLabel.tsx
    │   │   ├── Connections.tsx    # inter-project links
    │   │   └── CeoCore.tsx        # centre object
    │   ├── world/
    │   │   ├── ProjectWorld.tsx   # generic renderer for any project
    │   │   ├── WorldCore.tsx
    │   │   ├── AgentEntity.tsx    # moving agent node
    │   │   ├── WorldNode.tsx      # CRM, Website, Revenue, etc.
    │   │   ├── FlowParticle.tsx   # data travelling a flow
    │   │   └── FlowPath.tsx       # curve between nodes
    │   ├── modes/
    │   │   ├── AnalyticsLayer.tsx # floating charts inside a world
    │   │   ├── EconomyLayer.tsx
    │   │   └── WorkforceLayer.tsx
    │   ├── shaders/
    │   │   ├── orb.vert.glsl / orb.frag.glsl
    │   │   └── particles.vert.glsl / particles.frag.glsl
    │   └── hooks/
    │       ├── useActivity.ts     # activity score → visual params
    │       └── useHover.ts
    │
    ├── ui/
    │   ├── CommandShell.tsx       # canvas + all overlays
    │   ├── BootSequence.tsx
    │   ├── MorningBriefing.tsx
    │   ├── OrbHud.tsx             # hover info layer (drei <Html>)
    │   ├── AgentProfile.tsx
    │   ├── EventStream.tsx
    │   ├── CommandPalette.tsx     # cmdk
    │   ├── CeoConsole.tsx         # chat + mic
    │   ├── ModeBar.tsx            # Universe / Economy / Workforce toggles
    │   ├── ApprovalCard.tsx
    │   ├── Metric.tsx             # number + DEMO tag
    │   ├── Glass.tsx              # panel primitive
    │   └── charts/
    │       ├── Sparkline.tsx
    │       ├── Gauge.tsx
    │       └── Heatmap.tsx
    │
    ├── ceo/
    │   ├── buildContext.ts        # store snapshot → text for the model
    │   ├── demoResponder.ts       # rule-based answers when no key
    │   ├── intents.ts             # parse "show me contraxis" → store action
    │   └── tools.ts               # navigate / open / propose-approval
    │
    └── lib/
        ├── voice.ts               # speech recognition + synthesis
        ├── quality.ts             # device detection
        ├── format.ts              # currency, %, time
        └── ids.ts
```

---

## 5. Core data model

Cursor builds these in Step 1. Shown here so every later prompt refers to the same names.

```ts
// types/project.ts
export type ProjectStatus =
  | 'operational' | 'active' | 'idle' | 'attention' | 'warning' | 'error' | 'offline';

export interface ProjectMetrics {
  mrr: number; arr: number; revenueToday: number; revenue30d: number[];
  activeUsers: number; newLeads: number; qualifiedLeads: number;
  jobsWon: number; jobsLost: number; conversionRate: number;
  cac: number; ltv: number; avgLeadValue: number;
  operatingCosts: number; profit: number; growthRate: number;
  customers: number; contractors?: number;        // project-specific extras allowed
  [key: string]: number | number[] | undefined;
}

export interface ProjectDefinition {
  slug: string;                   // 'contraxis'
  name: string;                   // 'Contraxis'
  tagline: string;                // 'Local lead marketplace for contractors'
  accent: string;                 // hex
  universePosition: [number, number, number];
  connections: { to: string; kind: 'marketing' | 'technology' | 'publishing' | 'data' }[];
  agents: AgentDefinition[];
  nodes: WorldNode[];             // CRM, Website, Revenue …
  flows: Flow[];                  // pipelines that particles travel
  initialMetrics: ProjectMetrics;
  initialStatus: ProjectStatus;
  analyticsKeys: (keyof ProjectMetrics)[];  // which metrics to show in Analytics mode
  worldComponent?: React.ComponentType;     // optional custom world (Contraxis)
}

// types/agent.ts
export type AgentStatus = 'working' | 'idle' | 'waiting' | 'blocked' | 'error' | 'needs_approval';

export interface AgentDefinition {
  id: string;                     // 'contraxis.sales'
  projectSlug: string;
  name: string;                   // 'Sales Agent'
  role: string;
  objective: string;
  tools: string[];
  homePosition: [number, number, number];   // in world space
}

export interface AgentState {
  id: string;
  status: AgentStatus;
  currentTask?: string;
  targetNodeId?: string;          // where it is moving to
  completedToday: number;
  successRate: number;
  activeSince: number;            // epoch ms
  recentActions: AgentAction[];   // last 20
  stats: Record<string, number>;  // contacted, responses, conversions …
}

export interface AgentAction { ts: number; text: string; eventId: string; }

// types/world.ts
export interface WorldNode {
  id: string; label: string; kind: 'source' | 'system' | 'sink';
  position: [number, number, number];
}
export interface Flow {
  id: string; label: string;
  stages: FlowStage[];            // ordered
}
export interface FlowStage {
  id: string; label: string;      // 'Lead received', 'Qualified' …
  atNodeId?: string;              // or atAgentId
  atAgentId?: string;
  durationMs: number;
}

// types/events.ts
export type EventType =
  | 'agent.task.started' | 'agent.task.completed' | 'agent.status.changed'
  | 'lead.created' | 'lead.qualified' | 'contractor.contacted' | 'contractor.responded'
  | 'job.won' | 'job.lost' | 'sale.created' | 'payment.received'
  | 'email.received' | 'deployment.completed' | 'content.published'
  | 'trade.simulated' | 'trade.proposed'
  | 'system.error' | 'project.status.changed' | 'approval.requested' | 'approval.resolved'
  | 'flow.advanced';

export interface CommandEvent {
  id: string; ts: number; type: EventType;
  projectSlug: string; agentId?: string; nodeId?: string;
  flowId?: string; flowStageId?: string; flowInstanceId?: string;
  summary: string;                // 'Received new roofing lead'
  payload?: Record<string, unknown>;
  source: 'demo' | 'live';
}

// data/EventSource.ts
export interface EventSource {
  start(emit: (e: CommandEvent) => void): void;
  stop(): void;
}
```

Reducer rule: `reducers.ts` is the only place events change state. It updates metrics, agent status, flow instances, and appends to the event buffer. Components never mutate the store from events directly.

---

## 6. Design tokens (globals.css)

```css
:root {
  --void: #07080A; --graphite: #0E1013; --glass: rgba(23,26,31,.55);
  --line: rgba(255,255,255,.08); --text: #E6E8EC; --muted: #8A909A;
  --accent: #3D8BFF;
  --s-operational: #3D8BFF; --s-active: #6FE3B4; --s-idle: #5B616B;
  --s-attention: #F2C14E; --s-warning: #F2994A; --s-error: #E5533D; --s-offline: #3A3E45;
  --font-ui: 'Inter Tight', system-ui, sans-serif;
  --font-num: 'Geist Mono', ui-monospace, monospace;
  --radius: 14px; --blur: 18px;
}
```

Project accents (put in each `ProjectDefinition`):
Contraxis `#3D8BFF` · Socixis `#B48CFF` · Apixis `#5FD3F3` · AwadBot `#6FE3B4` · Publishing `#F2C14E` · Studios `#FF7A93` · Lyrixis `#8CA6FF` · Halaxis `#4FC3A1` · Rawixis `#C9A66B`.

Layout of the overlay (desktop):

```
┌──────────────────────────────────────────────────────────────┐
│ AWAD COMMAND        [Universe] [Economy] [Workforce]   ⌘K  ● │  ← top bar, 44px, fades when idle
│                                                              │
│                                                              │
│                    (3D canvas fills everything)              │
│                                                              │
│                                                              │
│ ┌ Event stream ─┐                         ┌ Context panel ─┐ │
│ │ 14:32 Contrax…│                         │ (agent profile │ │
│ │ 14:33 Socixis │                         │  / analytics   │ │
│ │ …             │                         │  / briefing)   │ │
│ └───────────────┘                         └────────────────┘ │
│              ┌── CEO ● Ask anything… 🎤 ──┐                  │
└──────────────┴───────────────────────────┴───────────────────┘
```

Left/right panels are 320px glass, collapsible, never both open on screens under 1280px. CEO bar is a 520px pill at the bottom centre.

---

## 7. Build prompts — Phase 1

Paste each block into Cursor Agent mode exactly as written. "Check" is what you verify before moving on.

### Step 0 — Scaffold

```
Create a Next.js 15 app in this folder with TypeScript (strict), App Router, src/ directory, Tailwind 4, ESLint, and pnpm. Install: three @react-three/fiber @react-three/drei @react-three/postprocessing zustand framer-motion maath cmdk lucide-react zod @types/three.

Then:
1. Create the folder structure from docs/BUILD_PLAN.md Section 4 (empty index.ts files with TODO comments are fine).
2. Add src/app/globals.css with the design tokens from BUILD_PLAN Section 6 and Tailwind import. Self-host Inter Tight and Geist Mono in public/fonts with @font-face.
3. Add scripts: "typecheck": "tsc --noEmit", "lint": "next lint".
4. Create .env.local.example with ANTHROPIC_API_KEY=, NEXT_PUBLIC_SUPABASE_URL=, NEXT_PUBLIC_SUPABASE_ANON_KEY=, SUPABASE_SERVICE_ROLE_KEY=, ALLOWED_EMAIL=.
5. Make src/app/page.tsx render a full-viewport black div with the text "AWAD COMMAND" centred in Inter Tight, weight 300, letter-spacing 0.3em, colour var(--text).
6. Add a next.config.ts rule so .glsl files import as raw strings (use a webpack loader or the ?raw approach — pick the one that works with Next 15 and Turbopack).
Do not build any 3D yet.
```

**Check:** `pnpm dev` shows the black page with the title. `pnpm typecheck` passes.

### Step 1 — Types, registry, demo data for every project

```
Implement the data model from docs/BUILD_PLAN.md Section 5 exactly, in src/types/*.

Then create src/projects/<slug>/index.ts for all nine projects (contraxis, socixis, apixis, awadbot, publishing, studios, lyrixis, halaxis, rawixis) plus src/projects/registry.ts that exports them as an array.

Each definition needs realistic demo content:
- contraxis: agents CEO, Sales, Lead Generation, Marketing, SEO, Customer Support, Analytics, Product, Development, Research. Nodes: Contractors, Customers, Leads, CRM, Website, Marketing, Analytics, Revenue. One flow "lead-to-revenue" with stages: Lead received (at Lead Gen agent) → Qualified (Lead Gen) → Matched (CRM node) → Contractor contacted (Sales) → Response (Contractors node) → Job won (Sales) → Revenue (Revenue node). Metrics: mrr 4821, revenueToday 684, activeUsers 247, newLeads 82, conversionRate 11.2, etc. Status operational. Connections to socixis (marketing) and apixis (technology).
- awadbot: agents Market Analyst, News Analyst, Technical Analyst, Risk Manager, Portfolio Manager. Nodes: Market Data, News, Paper Portfolio, Risk Model. Flow "analysis-to-trade": Signal → Debate → Risk check → Simulated trade → Portfolio update. Extra metrics: paperPortfolio 100000, todayPnl 1284, todayPct 1.28, aiConfidence 0.72. Positions and recent trades go in initialMetrics as arrays or in a small extras object.
- publishing: agents Publishing CEO, Research, Idea, Writer, Editor, Cover, Marketing, Sales Analytics. Nodes are 4 demo books (title, sales, royalties, rank, reviews, adSpend, status). Flow: Idea → Draft → Edit → Cover → Publish → Market.
- studios: agents Idea, Story, Character, Script, Director, Animation, Editor, Marketing. Flow with stages Idea → Story → Script → Characters → Scenes → Animation → Edit → Release → Marketing.
- socixis: content agents, flow Brief → Draft → Approve → Publish → Measure. Connection to contraxis (marketing) and from publishing (publishing).
- apixis, lyrixis, halaxis, rawixis: 4–7 agents each, one simple flow, lower activity. Give lyrixis status idle and rawixis status attention so the universe shows variety.

universePosition: spread the nine orbs on a loose ring of radius 9–13 with y between -2.5 and 2.5 and slight z variation so it reads as organic, not a diagram. Contraxis, Socixis and AwadBot nearest the front (positive z).

homePosition for agents: a ring of radius 4.5 around the world origin; nodes on an outer ring of radius 7.5. Alternate y slightly.

Add src/lib/format.ts with money(), pct(), compact(), clock() helpers. Everything must typecheck. No React yet.
```

**Check:** `pnpm typecheck` passes. `registry.ts` exports nine definitions and a `getProject(slug)` helper.

### Step 2 — Store

```
Create the Zustand store in src/store/useCommandStore.ts with slices in src/store/slices/*:

view: { view: 'boot'|'universe'|'project'|'agent'|'ceo', mode: 'default'|'economy'|'workforce'|'analytics', focusedProject?: string, focusedAgent?: string, hoveredProject?: string, dataMode: 'demo'|'live' }
camera: { target: { position:[x,y,z], lookAt:[x,y,z], duration:number } | null, requestId: number }
projects: Record<slug, { status, metrics, activity: number (0–1), lastEventTs }>
agents: Record<agentId, AgentState>
flows: Record<instanceId, { flowId, projectSlug, stageIndex, startedAt, stageStartedAt }>
events: { buffer: CommandEvent[] (max 500), unread: number }
ui: { paletteOpen, eventStreamOpen, contextPanel: 'none'|'agent'|'analytics'|'briefing'|'approval', briefingSeen, approvals: Approval[] }
quality: { level: 'high'|'medium'|'low', auto: boolean }

Actions: initFromRegistry(), enterProject(slug), enterAgent(id), returnToUniverse(), setMode(mode), hoverProject(slug|undefined), flyTo(target), openPanel(kind), closePanel(), togglePalette(), setQuality(), applyEvent(e) (delegates to src/data/reducers.ts), requestApproval(a), resolveApproval(id, decision).

enterProject must also call flyTo with a target 6 units in front of that orb's universePosition looking at the orb. returnToUniverse flies to [0, 4, 22] looking at origin.

Write src/data/reducers.ts: pure function applyEventToState(state, event) that:
- appends to events.buffer, bumps projects[slug].lastEventTs and activity (activity = clamp(activity + 0.08, 0, 1))
- for agent.* events updates that agent's status, currentTask, recentActions
- for flow.advanced creates/advances the flow instance and sets targetNodeId on the agent at that stage
- for lead.created increments newLeads; job.won increments jobsWon and revenueToday by payload.amount; payment.received increments revenueToday; trade.simulated updates todayPnl/todayPct
- for project.status.changed sets status
Add an activity decay: a store action tick(dt) that decays every project's activity by 0.03/s toward a floor of 0.15.

Add unit tests with vitest for reducers.ts covering lead.created, job.won, flow.advanced and activity decay.
```

**Check:** `pnpm test` passes. No UI yet.

### Step 3 — Demo event source

```
Create src/data/EventSource.ts (interface from BUILD_PLAN) and src/data/DemoEventSource.ts.

DemoEventSource:
- On start(), for each project in the registry, imports src/projects/<slug>/demo.ts which exports a function schedule(emit, project) that returns a cleanup. Use dynamic import or a demoRunners map in registry.ts — no hardcoded slug switch in DemoEventSource.
- Runs a global 1s tick that calls store.tick(1).
- Every event it emits has source:'demo'.

Write demo.ts for contraxis first, fully: every 6–14 seconds start a new lead-to-revenue flow instance. Each stage emits a flow.advanced event after its durationMs, plus the matching business event (lead.created at stage 1, lead.qualified at 2, contractor.contacted at 4, contractor.responded at 5, then 65% job.won with amount 180–900 / 35% job.lost). Also emit agent.task.started/completed for the agent at each stage with realistic summaries ("Researched contractor", "Sent outreach", "Updated conversion statistics"). Occasionally (every ~90s) emit project.status.changed to 'attention' for 20s then back to 'operational' so the warning state can be seen. Use a seeded PRNG (mulberry32) so the demo is repeatable.

Write demo.ts for awadbot: every 20–40s a full analysis-to-trade flow where the five agents each emit a task event with a one-line "opinion" in payload (this is the internal debate), then a trade.simulated event with symbol, side, size, pnl.

Write simpler demo.ts for the other seven projects: agent tasks every 10–30s, content.published for socixis, deployment.completed for apixis, sale.created for publishing, flow.advanced for studios. Lyrixis mostly silent. Rawixis emits a system.error every ~2 min.

Wire it up: src/data/index.ts exports startDataLayer() which picks DemoEventSource when dataMode==='demo' and feeds store.applyEvent. Call it once from a client component in page.tsx. Add a temporary <pre> on the page that prints the last 10 events so I can see it working.
```

**Check:** The page shows events ticking in every few seconds from multiple projects, Contraxis events walk through the pipeline stages in order.

### Step 4 — Canvas, environment, quality, camera rig

```
Replace the temporary page with the real shell.

1. src/scene/CommandCanvas.tsx: R3F <Canvas> with dpr from quality level (high: [1,2], medium: [1,1.5], low: 1), antialias true only on high, camera fov 45 at [0,4,22], gl { powerPreference:'high-performance', toneMapping: ACESFilmic, toneMappingExposure 1.1 }. Background var(--void). Wrap the scene in <Suspense>.
2. src/lib/quality.ts: detect level from navigator.hardwareConcurrency, deviceMemory, devicePixelRatio, and a 2s FPS probe on first load; store the result. Provide a manual override.
3. src/scene/Environment/Starfield.tsx: 4000 points (high) / 2000 / 800 in a shell radius 60–120, sizes 0.6–1.6, very faint (opacity 0.35), extremely slow rotation (0.004 rad/s). Use a custom shader with soft round points, no textures.
4. src/scene/Environment/Lighting.tsx: ambient 0.15, one key directional from upper-left at 0.6 (cool white), one rim light from behind at 0.3 tinted var(--accent). No shadows in Phase 1.
5. src/scene/Environment/Effects.tsx: @react-three/postprocessing EffectComposer with Bloom (luminanceThreshold 0.85, intensity 0.7, mipmapBlur) and Vignette (0.35). Disabled on low quality.
6. src/scene/CameraRig.tsx: subscribes to camera.target. When requestId changes, ease camera position and a lookAt vector toward the target using maath damp3 with the target's duration. Also owns drei <OrbitControls> with enablePan, damping 0.08, min distance 4, max 45; controls are disabled while a fly is in progress and re-enabled when within 0.05 units of target. When view==='universe' OrbitControls target is origin; when 'project' it is the world origin.
7. src/ui/CommandShell.tsx: renders CommandCanvas full-viewport with a pointer-events-none overlay layer for UI. page.tsx renders CommandShell and starts the data layer.

Add a tiny quality switcher in the bottom-right for now (H/M/L). Do not add orbs yet.
```

**Check:** Black scene with faint drifting stars, no errors, 60fps. Orbit with the mouse works. Changing quality changes star count.

### Step 5 — Project orbs

```
Build the universe view.

1. src/scene/universe/Universe.tsx: reads the registry and store.projects, renders <CeoCore/> at origin and a <ProjectOrb/> per project at its universePosition.
2. src/scene/universe/OrbCore.tsx: a sphere (radius 1.1) with a custom ShaderMaterial: fresnel rim in the project accent, a slow-moving internal noise pattern (3D simplex, 2 octaves) that suggests energy inside a glass ball, subtle transparency (alpha 0.55 centre → 0.9 rim). Uniforms: uAccent, uActivity, uTime, uStatusTint, uHover. Activity increases noise speed and brightness; hover raises rim brightness 20% and scale 1.08 with damping.
3. src/scene/universe/OrbParticles.tsx: internal particles (120/70/30 by quality) drifting inside the sphere, and 2 thin orbital rings of particles (80 each) at tilted angles that rotate at 0.15 + activity*0.4 rad/s. Points shader, accent colour, additive blending, size 0.03–0.06.
4. Status ring: a thin torus (tube 0.015) at radius 1.35 tinted by the status colour, opacity 0.5. For 'attention'/'warning' it pulses slowly (period 2.4s) — this is the only pulsing element. Never a bar.
5. src/scene/universe/OrbLabel.tsx: drei <Text> under each orb, Inter Tight 300, size 0.32, letterSpacing 0.18, uppercase project name, colour var(--text) at 0.85; below it a second line with two tiny stats (e.g. "MRR $4.8k · 14 agents") in Geist Mono size 0.16, muted, that only shows within 18 units of the camera.
6. src/scene/universe/CeoCore.tsx: at origin, a smaller (radius 0.7) brighter core in silver-white with a slow-rotating icosahedron wireframe shell (radius 1.0, opacity 0.12) and the label "AWAD" above it. It is clickable (later opens the CEO console).
7. Whole-universe motion: each orb bobs ±0.12 units on y at its own phase, period 6–9s. The whole ring drifts around y at 0.01 rad/s.
8. src/scene/hooks/useActivity.ts maps activity (0–1) → { particleSpeed, glow, ringSpeed } with easing so changes take ~2s.

Register pointer events on ProjectOrb: onPointerOver → store.hoverProject(slug) and cursor pointer; onPointerOut → undefined; onClick → store.enterProject(slug). Add a tiny debug overlay listing project activity values so I can see them respond to events.
```

**Check:** Nine living orbs around the centre core, each with its own colour. Contraxis visibly busier than Lyrixis. Rawixis shows the amber attention ring. Hover enlarges an orb. Clicking flies the camera up to it (nothing else happens yet).

### Step 6 — Inter-project connections + hover HUD

```
1. src/scene/universe/Connections.tsx: for every connection in the registry, draw a QuadraticBezierCurve between the two orbs, bowed 1.5 units toward the origin, as a Line with opacity 0.12 in a blend of both accents. Also draw faint lines from every orb to the CEO core at opacity 0.06. When an event's projectSlug has connections, spawn a small particle that travels the curve over 2.5s (max 12 live particles universe-wide; drop extras). Use one InstancedMesh for all travelling particles.

2. src/ui/OrbHud.tsx: shown via drei <Html> anchored to the hovered orb, offset to the right and slightly above, transform, distanceFactor 8, occlude off. Content is NOT a card: a vertical stack of 6 metric rows with a thin 1px leader line from the orb to the first row, each row "label / value" in two columns, background a very soft radial gradient of var(--glass) fading to transparent, no border, no radius. Rows: MRR, Revenue today, Active users, New leads, Active agents, Conversion. Then a status word tinted by status colour. Values use <Metric>. Fade in 180ms, fade out 120ms. On mobile widths hide the HUD entirely.

3. src/ui/Metric.tsx: props value, kind ('money'|'pct'|'int'|'compact'), and it renders the formatted value in Geist Mono; when store.dataMode==='demo' it appends a 9px "demo" tag in muted colour. Numbers animate on change with a 400ms tween (use framer-motion useSpring).

4. Subtle camera focus on hover: when hoveredProject is set, nudge the OrbControls target 15% of the way toward the orb with damping; release on unhover.
```

**Check:** Hovering Contraxis shows the floating readout with numbers that change over time and carry the demo tag. Lines connect Socixis–Contraxis, Apixis–Contraxis, Publishing–Socixis; sparks travel when events fire.

### Step 7 — Boot sequence

```
Create src/ui/BootSequence.tsx and show it when view==='boot' (the initial state).

Sequence (framer-motion, total ~5.5s, skippable with any key or click after 1s):
0.0s black with the starfield already rendering behind at 0 opacity
0.4s "AWAD COMMAND" fades in, weight 200, letter-spacing 0.4em, 44px, then settles to 0.3em over 1.2s
1.6s "Initializing AI ecosystem" fades in below, 13px muted, with a slowly blinking cursor
2.2s a check list appears one line every 220ms, Geist Mono 12px: project names left, dotted leader, "ONLINE" right in var(--s-active) — one line per registry project in this order: apixis, socixis, contraxis, publishing, awadbot, studios, then a final "CEO". Lyrixis shows "IDLE" in muted; rawixis shows "ATTENTION" in amber.
4.4s list and title fade out together
4.6s store.setView('universe') and flyTo from [0,1.5,6] (start the camera there during boot) to [0,4,22] over 2.4s with an easeOutQuint feel — this is the pull-back reveal. Starfield opacity ramps 0→1 over the same time.

The boot runs once per page load. Add ?skipboot=1 support for development.
```

**Check:** Refresh shows the cinematic boot, then the camera pulls back to reveal all orbs. Pressing a key skips it.

### Step 8 — Enter a project: transition and world container

```
Implement the universe → project transition.

1. When enterProject(slug) is called from the universe: fly to the orb (already done) over 1.4s; at 60% of the fly, start a 500ms crossfade: universe group scales other orbs down to 0 and fades them, the target orb scales up to radius 3.2 and becomes the WorldCore. Do this by keeping ONE scene graph: <Universe/> stays mounted but sets visible=false on non-focused orbs after the fade, and <ProjectWorld/> mounts inside the focused orb's group with the orb's material continuing as the core. Then fly to [0,3,16] relative to the world origin over 1.2s.
2. src/scene/world/ProjectWorld.tsx: generic renderer. Given a ProjectDefinition: <WorldCore/> at origin (the enlarged orb, radius 3.2, activity-driven), <AgentEntity/> for each agent at homePosition, <WorldNode/> for each node, <FlowPath/> for each consecutive pair of stages in each flow. If the definition has worldComponent, render it as a child so Contraxis can add extras.
3. src/scene/world/WorldNode.tsx: a small rounded octahedron (radius 0.35) in muted silver with a faint accent edge, drei <Text> label below (size 0.22). 'sink' nodes (Revenue) have a soft accent glow.
4. src/scene/world/AgentEntity.tsx: a 0.28 radius sphere in the project accent with a small orbiting dot, a 0.9 unit soft point light (medium/high only), label above. Status tint follows AgentStatus; 'needs_approval' shows a thin amber halo. Idle agents drift ±0.1 around home; working agents move (damped, ~2.5 units/s) toward store.agents[id].targetNodeId's position, hold there while the stage runs, then return home. Blocked/error agents sit still and dim.
5. src/scene/world/FlowPath.tsx: CatmullRom curve through the stage positions, drawn at opacity 0.1.
6. Return: an unobtrusive "← Universe" control top-left and the Escape key call returnToUniverse(): reverse the fade/scale, fly back to [0,4,22].
7. While in a project, the top bar shows the project name and status word.

Test with contraxis and awadbot. Everything else keeps working in the universe.
```

**Check:** Click Contraxis → camera flies in, universe dissolves, a large core with ten agents and eight nodes appears. Agents visibly move between positions as events arrive. Escape returns to the universe cleanly. Repeat five times with no leaks (check the R3F devtools object count stays flat).

### Step 9 — Contraxis world: watch the pipeline work

```
Make Contraxis the showcase world. Only touch src/projects/contraxis/** and src/scene/world/FlowParticle.tsx.

1. src/scene/world/FlowParticle.tsx: one InstancedMesh for all live flow instances in the current world. Each flow instance is a bright particle (0.12 radius, accent, additive, small trail of 6 fading copies) whose position is the current stage's node/agent position, moving along the FlowPath curve to the next stage when flow.advanced arrives (ease over 700ms). While a stage runs, the particle orbits its agent at radius 0.5.
2. Stage caption: a drei <Html> chip attached to the particle showing the stage label ("Qualified", "Contractor contacted", "Job won · $640") in 11px, glass background, appearing 200ms after arrival and hiding 300ms before departure. On 'job.won' the chip is tinted var(--s-active); on 'job.lost' it fades to muted and the particle dissolves.
3. On Revenue stage: the particle absorbs into the Revenue node, the node emits 8 tiny sparks, and the WorldCore brightness bumps 15% for 1s.
4. Custom pieces in src/projects/contraxis/world/: a faint ring of 12 small "contractor" markers orbiting the Contractors node, and a slow stream of 20 dim "customer" dots drifting from outside the world toward the Customers node (these are ambient, not events, and are visually much quieter than flow particles).
5. Agent work signals: when an agent's status is 'working', a 3-dot micro pattern rotates around it; when its task completes, the dots burst outward once (120ms).

Keep the max concurrent flow instances at 6; DemoEventSource for contraxis should respect that. Frame time must stay under 8ms for this world on HIGH.
```

**Check:** Sit in the Contraxis world for 60 seconds. You should be able to follow a single lead from arrival, to the Lead Agent, to CRM, to the Sales Agent, to Contractors, back, and into Revenue, with captions at each step. Roughly two out of three leads win.

### Step 10 — Agent profile

```
1. Clicking an AgentEntity calls enterAgent(id): the camera flies to 4 units in front of the agent (1.0s), the agent's label hides, and the context panel opens with kind 'agent'.
2. src/ui/AgentProfile.tsx (right glass panel, 320px): name, role, project, status word tinted, current objective (from definition), current task, then a 2×3 grid of stats (Completed today, Success rate, Contacted, Responses, Conversions, Projected revenue — take from agent.stats, hide missing), time active (formatted from activeSince), tools as small muted chips, then "Recent actions" — the last 12 recentActions with Geist Mono timestamps. A "Back to world" control. Every number via <Metric>.
3. Escape or Back returns to the world camera position and closes the panel. Escape again returns to the universe.
4. The panel content updates live as events arrive (no reopen needed).
5. Make sure agent.stats are actually populated by the reducer for contraxis events (contacted on contractor.contacted, responses on contractor.responded, conversions on job.won, projectedRevenue += amount*0.35).
```

**Check:** Click the Sales Agent — the camera focuses it and the panel shows a live action log filling up. Numbers carry the demo tag.

### Step 11 — Analytics mode

```
Add Analytics mode inside any project world (store.setMode('analytics') while view==='project'). Toggle via an "Analytics" control in the top bar and the A key.

1. src/scene/modes/AnalyticsLayer.tsx: when active, the world dims 25% (agents and flows stay visible and animated) and 8–12 floating analytics elements fade in on a ring of radius 10 at y 3–5, always facing the camera (drei <Billboard>), rendered with <Html transform distanceFactor 10> so they're crisp. Which metrics: definition.analyticsKeys. Each element is one of:
   - Sparkline (src/ui/charts/Sparkline.tsx, SVG, 120×36) for series like revenue30d
   - Gauge (src/ui/charts/Gauge.tsx, SVG arc, 72px) for rates: conversion, success, growth
   - Data panel: label + big Metric + trend arrow with % delta vs yesterday (compute from demo history kept in the project slice — add a metricsHistory ring of 60 samples taken every 30s, plus seed 30 days of demo history in initialMetrics)
   - Heatmap (src/ui/charts/Heatmap.tsx, 7×24 grid, 3px cells) for agent activity by hour
   - Agent activity bar: agents ranked by completedToday
   Elements are glass with no border, 220px max width, and never overlap the core.
2. Numbers "flow": use the Metric spring so changes tick visibly.
3. For Contraxis show: revenue, MRR, ARR, leads, qualified leads, jobs won/lost, contractors, customers, conversion, CAC, LTV, avg lead value, agent activity, operating costs, profit, growth. Group them so the ring reads: money on the left, funnel on the right, people/agents at the back.
4. Leaving analytics mode fades everything out over 300ms. Mode persists per project until changed.
```

**Check:** Press A inside Contraxis: charts appear around the world, agents keep working underneath, nothing covers the core. Orbiting the camera keeps charts readable.

### Step 12 — Economy and Workforce modes

```
Both modes work from the universe view. Add a ModeBar (src/ui/ModeBar.tsx) top-centre with Universe / Economy / Workforce; keys 1/2/3.

Economy (src/scene/modes/EconomyLayer.tsx):
- Orbs shrink to radius 0.8 and lose their orbital rings; the connection curves brighten to opacity 0.4 and gain a directional flow: a continuous stream of small particles from source to target at a rate proportional to the connection's monthly value (put a demo value on each connection in the registry; e.g. socixis→contraxis marketing $1,900/mo).
- Each orb gets a floating figure above it: MRR and a small profit/loss tint. A summary element at the top: total MRR, total revenue today, total profit — via <Metric>.
- When a real business event fires (payment.received, sale.created, job.won), a brighter particle travels from that project to the CEO core.
- Camera flies to a higher vantage [0, 14, 20] looking at origin.

Workforce (src/scene/modes/WorkforceLayer.tsx):
- Orbs fade to 25%. Every agent across every project appears as a small entity clustered near its project orb (spiral packing, 0.25 spacing), tinted by AgentStatus. Hovering an agent shows name + task; clicking calls enterAgent (which enters the project world first, then focuses the agent).
- A left glass panel lists "42 active agents" (real count from store), then per project: name, agent count, and six tiny status dots counts (working/idle/waiting/blocked/error/needs approval). Clicking a project row fires enterProject.
- Camera to [0, 8, 24].

Selecting Universe restores everything. Modes must not fight the hover HUD: HUD is disabled in Economy/Workforce.
```

**Check:** Economy shows money streaming between businesses and a total at the top. Workforce shows every agent with the correct total count, and clicking one lands you on its profile inside its world.

### Step 13 — Event stream

```
src/ui/EventStream.tsx as the left glass panel (toggle with E key or the top-bar icon; open by default on ≥1280px, closed on smaller).

- Renders the last 80 events from the buffer newest-first, virtualised (use a simple windowed list, no heavy dependency). Row: Geist Mono time HH:MM:SS, project name in its accent, agent name, summary. New rows slide in 12px over 200ms; no other row animates.
- Filter chips at the top: All / Money / Agents / Issues / a project picker. Search box filters summary text.
- Clicking a row: enterProject(slug) then, when the fly completes, if agentId is set enterAgent(agentId); if the event has a flowInstanceId that is still live, the camera instead frames that flow particle for 2s (add a store camera helper followFlowInstance(id)).
- A small unread count on the toggle when the panel is closed. Issues (system.error, status changed to warning/error, approval.requested) get a 2px left border in the status colour.
- Every row shows "demo" in the muted tag style at the far right when source==='demo'.
```

**Check:** Clicking a "Received new roofing lead" row flies into Contraxis and follows that lead. Clicking a Rawixis error row enters Rawixis.

### Step 14 — CEO console (text), server route, demo responder

```
Build the AWAD CEO conversation. Read docs/VISION.md section "AWAD CEO" first.

1. src/ceo/buildContext.ts: turns the store into a compact text snapshot (< 3,000 tokens): per project status, key metrics, activity, agent counts by status, the 40 most recent events, open approvals, and the dataMode. Also returns a list of "attention items": projects in attention/warning/error, agents blocked/error/needs_approval, negative growth, and system.error events in the last hour.
2. src/ceo/intents.ts: parses user text for navigation intents before or alongside the model: "show|open|go to <project>" → enterProject; "show (me )?the (three|items|problems|issues)" → open the attention list and enterProject on the first; "analytics" → setMode; "economy"/"workforce" → modes; "compare X and Y" → economy mode plus a two-column comparison panel. Return the actions taken so the model can mention them.
3. src/ceo/tools.ts: tool definitions for the model: navigate(project?, agent?, mode?), open_panel(kind), propose_approval({title, description, kind:'deploy'|'campaign'|'financial'|'other', risk:'low'|'medium'|'high'}). Tools never execute business actions directly — propose_approval only creates an approval card.
4. src/app/api/ceo/route.ts: POST { messages, context }. If process.env.ANTHROPIC_API_KEY exists, call Anthropic Messages API (model from env CEO_MODEL, default a current Sonnet) with a system prompt: "You are AWAD CEO, the executive AI over Awad's businesses. Answer from the snapshot only; if the snapshot is demo data, say so briefly once per conversation and never present figures as real. Be concise, numeric, decisive. Use tools to navigate the interface when the user asks to see something." Stream the response. Handle tool calls by returning them in the stream for the client to execute via store actions. If no key: return src/ceo/demoResponder.ts output, a rule-based responder that answers the sample questions from VISION.md ("what's happening", "how much did we make today", "what needs my attention", "compare socixis and contraxis", "why is contraxis slowing down", "what did the bots accomplish overnight") using the snapshot, plus a fallback that summarises the top three attention items.
5. src/ui/CeoConsole.tsx: the bottom-centre pill. Collapsed: "Ask AWAD CEO" with a dot that pulses only when there are unresolved attention items. Expanded (click, or the / key, or clicking the CEO core, which also flies the camera to [0,2.5,7]): a glass column 520px wide, up to 55vh, with the transcript, streaming text, and an input. Messages from the CEO that triggered navigation show a small "Navigated to Contraxis" line. Show a "demo data" tag in the header when dataMode==='demo'.
6. src/ui/ApprovalCard.tsx: shown in the context panel when the CEO calls propose_approval: title, description, risk word tinted, buttons Approve / Deny / Review. Approve or Deny emits approval.resolved and the card records who and when; nothing else happens in Phase 1. Financial kind requires typing "confirm" before Approve enables.
7. Add a "Deploy the new Contraxis landing page" demo path: the demo responder answers with a recommendation and a propose_approval.

Never expose the key. The client only ever calls /api/ceo.
```

**Check:** With no key, type "what needs my attention?" → a sensible answer from live demo state, with the demo caveat. "Show me Contraxis" flies the camera. With a key in .env.local, the same works via the model and streams. "Deploy the landing page" produces an approval card; Approve records it.

### Step 15 — Voice

```
src/lib/voice.ts: wrap window.SpeechRecognition / webkitSpeechRecognition (continuous false, interimResults true, lang en-US) and speechSynthesis. Export useVoice() with { supported, listening, interim, start, stop, speak(text), stopSpeaking }.

In CeoConsole: a mic control right of the input. Press-and-hold or click-to-toggle (setting in ui slice). While listening, show the interim transcript in the input and a small 4-bar level animation driven by an AnalyserNode on getUserMedia. On final result, submit as a message. CEO replies are spoken with speechSynthesis (pick a natural en-US voice if available; rate 1.0) unless the user has muted output (speaker control). Speaking stops if the user starts talking.

If speech is unsupported (Firefox), hide the mic and show a tooltip once.

Wake phrase: if the transcript starts with "CEO," strip it. Test "CEO, what's going on?" then "show me the three".
```

**Check:** Speaking "CEO, what's going on" gets a spoken summary; "show me the three" navigates to the first attention project.

### Step 16 — Command palette and morning briefing

```
1. src/ui/CommandPalette.tsx with cmdk. Open with ⌘K / Ctrl+K. Title "AWAD COMMAND". Groups: Navigate (every project, "Universe", "AWAD CEO", each agent), Modes (Economy, Workforce, Analytics), Views (Revenue → economy mode with money filter, Active agents → workforce, Problems → event stream filtered to issues + fly to first attention project, Today's sales → economy + filter, Overnight → event stream filtered to events between 00:00 and 07:00 local, Compare businesses → economy), Actions (Open event stream, Quality High/Medium/Low, Toggle voice output, Rerun boot). Free text that matches no command is sent to the CEO. Glass, centred, 560px, no borders, 12px results.

2. src/ui/MorningBriefing.tsx: shown once per local calendar day on first entry to the universe (ui.briefingSeen with the date in localStorage), 1.5s after the boot reveal. A centred glass column, 640px: "Good morning, Awad" (use the hour: morning/afternoon/evening), then rows for projects operational, agents active, revenue today, new customers, new leads, system issues — each a <Metric>. Then "CEO recommendation": a 1–2 sentence text produced by src/ceo/briefing.ts from the snapshot (demo: the highest-activity project with a negative delta, e.g. lead volume up but conversion down). Buttons: Investigate (enterProject on the recommended project and open analytics) and Dismiss. A "Briefing" entry in the palette reopens it.
```

**Check:** ⌘K → "problems" → flies to Rawixis with the issue list open. Briefing appears after boot and Investigate lands in Contraxis analytics.

### Step 16b — World news corner (Europe & Middle East)

```
Add a compact live-news element in the top-right corner, below the top bar. It is glass, 300px wide, no border, collapsible, and never covers the 3D content behind it more than necessary.

1. src/app/api/news/route.ts (server-only, cached 10 minutes with Next revalidate): fetch and merge RSS feeds — BBC Europe, BBC Middle East, Al Jazeera, Reuters World (or a news API key from env NEWS_API_KEY if present, with region filters Europe + Middle East). Parse with fast-xml-parser. Return the 20 newest items: { title, source, url, publishedAt, region }. Normalise region from the feed category. Never expose the API key.
2. src/ui/NewsCorner.tsx: header "Europe & Middle East" with a Europe / Middle East / Both filter, then a vertical list of 6 headlines (title in 12px, source + relative time in muted Geist Mono 10px). Headlines rotate one at a time every 8s with a 200ms crossfade; hovering pauses; clicking opens the article in a new tab. A tiny "live" dot when the last fetch is under 15 minutes old; if the fetch fails, show the last cached set with "offline" in muted.
3. Poll /api/news every 5 minutes on the client. Add "News" to the command palette (toggle) and an N key.
4. On tablet/mobile the corner becomes a single rotating headline strip above the CEO pill.
5. Keep it quiet: no images, no red banners, no scrolling ticker. This is a peripheral awareness element, not the focus.
```

**Check:** Corner shows real headlines from Europe and the Middle East within a few seconds of load, filter works, and the palette toggles it.

### Step 17 — The other worlds

```
Use the generic ProjectWorld for awadbot, publishing and studios, with these additions in each project's world/ folder:

awadbot: a Paper Portfolio node that shows a floating readout (portfolio value, today P&L, %) and a small Positions list panel on click (symbol, size, unrealised P&L); a Risk Model node with a gauge. During the analysis-to-trade flow, show the five agents' one-line opinions as sequential caption chips around the core (this is the visible debate), then the trade.simulated result chip on the Portfolio node. Header shows "Paper trading" permanently. No order-execution code exists anywhere.

publishing: books are the nodes — render each as a thin box 0.5×0.75×0.06 with the accent spine, floating on a shelf ring. Clicking a book focuses it and opens a context panel with title, sales, royalties, rank, reviews, ad performance, marketing, status. Flow particles move along Idea → Draft → Edit → Cover → Publish → Market.

studios: nodes laid out as a left-to-right production line (9 stages, x from -8 to 8); each stage has its agent above it; flow particles move down the line; a small progress marker under each stage shows how many items are at that stage (from live flow instances).

apixis, socixis, lyrixis, halaxis, rawixis: generic world only. Rawixis's error events should appear as a red-tinted chip on the affected node and set the world's status tint.

Confirm you can enter and leave every one of the nine worlds without errors or leaks.
```

**Check:** All nine orbs enter a world. AwadBot shows the debate then a simulated trade. Publishing books open. Studios pipeline flows left to right.

### Step 18 — Performance, responsiveness, polish pass

```
1. Profiling: add a hidden stats overlay (drei <Stats> behind ?stats=1). Verify frame time on HIGH in the universe and in Contraxis with analytics on. Fix anything over 12ms: merge geometries, use InstancedMesh for all repeated small objects, dispose materials on unmount, memoise shader materials, cap Html elements to what's on screen.
2. Quality levels: MEDIUM halves particle counts and disables agent point lights; LOW also disables postprocessing, orb noise (flat fresnel only), trails, and sets dpr 1. Auto-detect on load, allow override in the palette, persist to localStorage.
3. Responsiveness: ≥1600px: both side panels can be open, CEO pill 600px. 1280–1600: one side panel at a time. 768–1280 (tablet): panels become bottom sheets, ModeBar collapses to a menu. <768 (mobile): render the universe with LOW forced, touch orbit/pinch zoom only, tap an orb → enter, a bottom sheet replaces all panels, the event stream is a sheet, the CEO pill is full-width. Hide the hover HUD, show a tap-hold readout instead.
4. Idle chrome: the top bar and pill fade to 40% after 6s without pointer movement and return on movement.
5. Reduced motion: if prefers-reduced-motion, cut boot to 1.5s, shorten camera flies to 400ms, and stop bobbing.
6. Keyboard: Esc (back), 1/2/3 (modes), A (analytics), E (events), / (CEO), ⌘K. Visible focus rings on all overlay controls.
7. Remove all debug overlays and console logs. Update docs/README.md with run instructions, keys, quality levels, and a clear statement that all data is DEMO until Phase 2 sources are connected.
```

**Check:** Lighthouse performance ≥ 80 on desktop. MacBook stays at 60fps in HIGH. Phone shows a usable touch universe. No console errors on any screen.

---

## 8. Phase 2 — Real data layer (Supabase + auth)

Do this only after Phase 1 is committed and demo-complete.

### Step 19 — Schema

```
Create supabase/migrations/0001_core.sql with tables (all with id uuid pk default gen_random_uuid(), created_at timestamptz default now()):
projects(slug text unique, name, status, accent, config jsonb)
agents(id text pk, project_slug fk, name, role, objective, tools text[], status, current_task, stats jsonb, active_since)
agent_tasks(agent_id fk, title, status, started_at, completed_at, result jsonb)
events(ts timestamptz, type text, project_slug, agent_id, node_id, flow_id, flow_stage_id, flow_instance_id, summary, payload jsonb, source text)
metrics_daily(project_slug, day date, metrics jsonb, unique(project_slug, day))
leads(project_slug, status, value numeric, payload jsonb)  sales(project_slug, amount, currency, payload jsonb)
customers(project_slug, external_id, payload jsonb)  transactions(project_slug, amount, kind, payload jsonb)
expenses(project_slug, amount, category, payload jsonb)  messages(project_slug, channel, subject, from_addr, importance int, payload jsonb)
deployments(project_slug, env, status, sha, payload jsonb)  approvals(title, description, kind, risk, status, requested_by, resolved_by, resolved_at, payload jsonb)
system_status(project_slug unique, status, detail, updated_at)
Indexes on events(ts desc), events(project_slug, ts desc). Enable RLS on every table; policy: authenticated user whose email = current_setting('app.allowed_email') can select; only service role can insert/update. Enable Realtime on events, agents, approvals, system_status.
Also a postgres function emit_event(...) that inserts into events and, when type is in a list, updates the matching metrics_daily row.
```

### Step 20 — SupabaseEventSource and reducers reuse

```
src/data/SupabaseEventSource.ts: on start, fetch the last 200 events and current agents/projects/system_status into the store (one initFromSupabase action), then subscribe to Realtime inserts on events and updates on agents/approvals/system_status, mapping rows to CommandEvent and calling emit. Reuse reducers.ts unchanged. dataMode becomes 'live' when NEXT_PUBLIC_SUPABASE_URL is set and the initial fetch succeeds; otherwise fall back to demo and show a "demo data" notice in the top bar. Never mix: if live, DemoEventSource must not run.
Add a src/app/api/events/route.ts (service role, server-only) that accepts POST from your own systems (shared secret header) and calls emit_event — this is how Contraxis, Socixis etc. will push real events later.
```

### Step 21 — Auth

```
Supabase Auth with email magic link via @supabase/ssr. Middleware protects everything except /login and /api/events (which uses its own secret). Only the email in ALLOWED_EMAIL may sign in (check in a server action; reject others). Keep the login page in the same visual language: void background, starfield, one field. Session refresh in middleware. Sign out in the palette.
```

---

## 9. Phase 3 — Integrations (expanded in Part C)

Each integration is a small server-side worker or webhook receiver that posts events to `/api/events`. Order of value: Contraxis app events (lead/job/payment) → Stripe payments (all projects) → Socixis publishing events → email importance scoring → KDP reports import (CSV/report API) → AwadBot paper-trade engine → agent runners (each agent becomes a real worker that writes agent_tasks and events) → real CEO orchestration (the CEO route gains tools that create agent_tasks, always through approvals for anything that changes the outside world or money).

Rule for every Phase 3 prompt: "This integration only emits events and writes rows. It never triggers a destructive or financial action; those go through the approvals table and require a human decision in the UI."

---

## 10. Common problems and what to tell Cursor

- **Camera fights / jitter:** OrbitControls and CameraRig both moving the camera. "Disable controls while a fly is active; only CameraRig writes camera.position during a fly."
- **Frame drops in Contraxis:** too many `<Html>` elements or per-agent lights. "Cap Html chips at 8 visible, use InstancedMesh for particles, remove agent point lights on medium."
- **Things animate from timers inside components:** "Move this to demo.ts and drive it through an event; components only read the store."
- **Numbers hardcoded in JSX:** "Route through <Metric> and read from the store."
- **Modal or new page appears:** "Never. Keep the canvas mounted; use the context panel or a camera move."
- **Neon / gamer look creeping in:** "Reduce bloom to 0.7, opacity of lines to 0.1, and make status a thin ring."
- **Memory leaks after entering/leaving worlds:** "Dispose geometries and materials in useEffect cleanup; reuse shader materials via useMemo at module scope."
- **Cursor adds features from later steps:** "Revert those; implement only this step."

---

## 11. Definition of done for Phase 1

Open the app fresh. Boot plays, camera reveals nine living orbs. The briefing appears with demo-tagged figures and Investigate flies into Contraxis. Inside, a lead can be followed from arrival to revenue with captions. Press A: analytics surround the world. Esc: back in the universe. Economy shows money flowing; Workforce shows every agent with a correct count. ⌘K "problems" lands on the attention project. The CEO answers questions from live demo state (spoken if asked), navigates the world on request, and proposes a deployment that waits for Approve. Every number on screen says demo. No console errors, 60fps on a MacBook.


---

# PART C — Making it real: the worker, the task loop, and integrations

Phase 1 gives a living demo. This part is what makes "tell it to do something and it does it and reports back" true. Read it after Phase 1 is committed. The rules from `.cursor/rules/awad-command.mdc` still apply.

## C1. The shape of the whole system

```
      You (phone / laptop)
             │  talk / type / approve
             ▼
   AWAD COMMAND web app  ── Vercel ──  always online, login-protected
             │  reads & writes
             ▼
   Supabase  ── the filing cabinet ──  projects · agents · tasks · events · approvals
             ▲                    ▲
             │ picks up tasks     │ posts events
             │ files results      │
   ┌─────────┴─────────┐   ┌──────┴──────────────────────┐
   │  WORKER            │   │  INTEGRATIONS (webhooks)     │
   │  always-on process │   │  Stripe · Contraxis app ·    │
   │  runs the agents   │   │  email · KDP · Socixis …     │
   │  uses tools/keys   │   └──────────────────────────────┘
   │  (optionally on    │
   │  its own computer, │
   │  see Part D)       │
   └────────────────────┘
```

One rule ties it together: **nothing changes the outside world except the worker, and the worker only acts on a task row that either needs no approval or has an approved approval row attached.**

## C2. How a command travels (the report-back loop)

1. You say "Deploy the new Contraxis landing page."
2. `/api/ceo` (already built) calls `propose_approval` → an `approvals` row (status `pending`) and an `agent_tasks` row (status `waiting_approval`) are created, linked. The 3D world shows the amber "needs approval" halo on the Development Agent.
3. You tap Approve. `approvals.status = approved`, `agent_tasks.status = queued`. Event `approval.resolved`.
4. The worker polls, claims the task (`claimed`, with its worker id and a lease expiry), then `running`. Event `agent.task.started`. The agent entity in the world moves to the Website node.
5. The worker runs the agent loop: model call → tool call (Vercel deploy) → observe → repeat, writing an `agent.step` event for each step with a one-line summary.
6. On success: `done`, `result` JSON, event `deployment.completed`, plus a `report` text field written for humans. On failure: `failed`, `error`, event `system.error`.
7. The CEO console shows "Done — landing page deployed to contraxis.com (build 4f2a1)" as a message from the CEO, sourced from the task's `report`. The event stream shows the steps. Nothing here is simulated.

Task states: `queued → claimed → running → done | failed | cancelled`, with `waiting_approval` before `queued` when needed. Leases expire after 10 minutes so a crashed worker's task gets re-queued.

## C3. Worker specification

- Runtime: Node 20 + TypeScript, its own repo `awad-worker` (or `worker/` folder in the monorepo). Deploy on Railway or Render (about $5–20/month). One process, restarts automatically.
- Connects to Supabase with the service role key (server secret). Never exposed anywhere else.
- Loop: every 3 seconds select one `queued` task (oldest first, project round-robin), claim it atomically (`update … where status='queued' returning *`), run it, write results. Heartbeat to `system_status` every 30s (`worker: online`).
- Agent loop: Anthropic Messages API with tool use. The system prompt is assembled from `agents` row (role, objective, tools) + project context. Max 25 tool steps per task; each step writes an `agent.step` event. Budget per task in tokens and dollars; over budget → `failed` with reason.
- Tools are a registry: each tool declares `name`, `schema`, `risk: 'read' | 'write' | 'money' | 'destructive'`, and `run()`. Tools with risk `money` or `destructive` refuse to run unless the task has an approved approval. `write` tools run if the task was created by an approved plan or by a human. `read` tools always run.
- Memory: each agent gets a `memory` jsonb on its row (short notes it keeps across tasks, capped at 4 KB) and can read the last 20 events for its project.
- Reporting: every task ends with the model writing a `report` in plain English of what it did, what changed, and what it recommends next. This is what the CEO reads to you.

## C4. First tools (in build order)

| Tool | Risk | What it lets an agent do |
|---|---|---|
| `supabase.query` | read | Look at leads, sales, events, metrics for its project |
| `http.fetch` | read | Read any public web page or API |
| `web.search` | read | Search the web (Brave or Tavily key) |
| `email.send` | write | Send email from the agent's own address (Resend) |
| `email.read` | read | Read the agent's inbox (Gmail API on the agents' account) |
| `vercel.deploy` | write | Trigger a deployment of a named project |
| `social.publish` | write | Publish a scheduled post through Socixis |
| `stripe.read` | read | Read balances, payouts, recent charges |
| `stripe.refund` | money | Refund a charge — approval required |
| `file.write` / `file.read` | write/read | Work on files in the task workspace |
| `computer.*` | write | Use the agent computer — see Part D |

## C5. Cursor prompts for Part C

### Step 22 — Worker skeleton

```
Create a new package worker/ (TypeScript, Node 20, pnpm) in the monorepo with its own package.json, tsconfig, and a Dockerfile for Railway.

1. src/db.ts: Supabase client with the service role key from env. Helpers: claimTask(workerId), updateTask(id, patch), insertEvent(e), heartbeat(workerId).
2. src/loop.ts: the 3-second poll described in BUILD_PLAN Part C3, with atomic claim (update … where status='queued' … returning) and a 10-minute lease (lease_until column — add a migration 0002_tasks.sql adding lease_until, worker_id, claimed_at, result jsonb, error text, report text, budget_usd numeric default 0.5, spent_usd numeric default 0, approval_id uuid fk to approvals).
3. src/agent.ts: runTask(task): loads the agents row and project, builds the system prompt, runs the Anthropic tool-use loop with @anthropic-ai/sdk (model from env WORKER_MODEL), max 25 steps, tracks tokens → spent_usd using a price table in src/pricing.ts (keep it in one place so it can be updated), writes agent.task.started, agent.step (summary per step), agent.task.completed or system.error events, and the final report.
4. src/tools/index.ts: the registry with { name, description, schema (zod), risk, run } and a guard that refuses money/destructive tools unless task.approval_id resolves to an approved row.
5. First two tools: supabase.query (read-only SQL against a whitelist of views: v_leads, v_sales, v_events, v_metrics — create the views in the migration) and http.fetch (GET only, 1 MB cap, 10 s timeout, blocks private IP ranges).
6. src/index.ts: starts the loop and heartbeat, logs to stdout in JSON, handles SIGTERM by releasing any claimed task.
7. A README with Railway deploy steps and the env list: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, WORKER_MODEL, WORKER_ID.

Test: insert a queued task for contraxis.analytics with the instruction "Summarise today's leads and conversion", run the worker locally, and confirm events and a report appear in the tables and in the 3D event stream.
```

### Step 23 — CEO creates real tasks

```
In src/ceo/tools.ts add create_task({ agentId, instruction, requiresApproval, risk, title }) and in /api/ceo handle it: if requiresApproval, insert an approvals row (pending) and an agent_tasks row (waiting_approval, approval_id set); otherwise insert queued. The ApprovalCard's Approve action must now update both rows (approved / queued) through a server action, never from the client with the anon key beyond RLS allowances — add a policy or a server action with the service role.

The CEO system prompt gets a rule: "Read-only questions are answered from the snapshot. Anything that changes the world becomes a task via create_task. Money or public-facing changes set requiresApproval=true. After creating a task, tell the user what you queued and that you'll report when it completes."

Add a Supabase Realtime subscription in the client that, when a task the CEO created reaches done or failed, posts its report into the CEO console as a new CEO message prefixed "Report:". Demo mode keeps the old behaviour.
```

### Step 24 — Write tools: email and deploy

```
Add tools email.send (Resend, from an agents-only domain like agents.apixis.dev, always BCC a log address, 20/day cap per agent) and vercel.deploy (Vercel REST API, projects whitelisted in env VERCEL_PROJECTS as slug:projectId pairs; waits for READY state, returns URL). Both are risk 'write'. Add the deployment.completed and email.sent events. Extend the demo path "Deploy the new Contraxis landing page" so that with keys present it really deploys after approval.
```

### Step 25 — Money in: Stripe webhook

```
Add src/app/api/webhooks/stripe/route.ts verifying the Stripe signature (STRIPE_WEBHOOK_SECRET). Map events: payment_intent.succeeded → payment.received (amount, project from metadata.project or from the statement descriptor map in env), charge.refunded → payment.refunded, customer.created → customer.created. Insert into sales/transactions/customers and call emit_event. Add a stripe.read tool to the worker. Multiple ventures share one Stripe account, so project attribution comes from metadata first, statement descriptor second, and 'unassigned' otherwise — surface unassigned payments as an attention item for the CEO.
```

### Step 26 — Business events from Contraxis

```
In the Contraxis app (separate codebase), add a tiny client that POSTs to AWAD COMMAND /api/events with the shared secret on: lead created, lead qualified, contractor matched, contractor contacted, contractor responded, job won (amount), job lost. Map to the CommandEvent types. Confirm the Contraxis world animates the real lead-to-revenue pipeline with live source tags and the demo runner is off for that project.
```

Repeat the Step 26 pattern for Socixis (content.published, campaign.started), Publishing (import KDP reports on a schedule into sales/metrics_daily), and AwadBot (paper-trade engine writes trade.simulated; there is no order-execution tool and there must never be one without a separate written decision).

---

# PART D — The agents' own computer

The worker in Part C can call APIs. Some jobs need hands: open a browser, log into a portal that has no API (KDP reports, a supplier site), test a website like a person, edit files, run scripts. For that the agents get their own computer.

## D1. Choose the machine

| Option | Cost | Best for | Notes |
|---|---|---|---|
| Cloud Linux VM (Hetzner, DigitalOcean, AWS) | ~$20–60/month | Most people; start here | Always on, easy to rebuild, snapshot before risky work |
| Mac mini at home | ~$600 once | If you want it physically yours | Needs stable power/internet and a way to reach it from outside (Tailscale) |
| Cloud Windows/macOS desktop | ~$40–150/month | Only if a needed app is desktop-only | Slower to set up |

Recommendation: one cloud Linux VM (4 vCPU, 8 GB) for Contraxis first. Add machines per project only when one is proven.

## D2. What runs on it

- The **worker** from Part C (same code, with `WORKER_CAPABILITIES=computer`) so tasks tagged `needs_computer` route here.
- **Claude Code** in headless mode or the **Claude Agent SDK** as the execution engine for file/terminal work, with a project folder per venture.
- A **browser the agent can drive** (Playwright with Chromium, persistent profile per project so logins survive).
- A **screen** the human can watch: run a virtual display (Xvfb) with noVNC, or stream the Playwright viewport as JPEG frames over WebSocket. This feeds the "Screen" node in the 3D world.
- **Tailscale** so the command center and you can reach it privately without opening ports.

## D3. How it connects to the command center

Same filing cabinet, no new protocol. Tasks carry `capabilities: ['computer']` when they need hands; the computer-worker only claims those. Every step still writes `agent.step` events, and the browser tool also writes a `screenshot_url` on the step (stored in Supabase Storage) so the event stream can show thumbnails and the Screen node can show the live view.

## D4. Setup checklist (do in this order)

1. Create a separate Google account and email for the agents (e.g. agents@…). Never reuse your personal logins.
2. Create the VM, install Tailscale, Node 20, Chromium, Xvfb, noVNC. Snapshot it ("clean").
3. Install the worker with `WORKER_ID=contraxis-computer-1`, `WORKER_CAPABILITIES=computer`.
4. Give it only the keys it needs for the first three tasks. A prepaid card with a low limit if any purchase is ever in scope; otherwise no card at all.
5. Turn on daily snapshots and a 2 AM restart.
6. Add the Screen node (Step 28) and confirm you can watch it work from your phone.

## D5. Safety rules that do not bend

- Its own accounts, its own card (or none), its own machine. Your personal accounts never live on it.
- `computer.*` tools are risk `write`. Any purchase, publish, delete, or send-to-a-real-customer step inside a computer task pauses the task (`waiting_approval`) and shows an approval card with a screenshot. It continues only after Approve.
- A kill switch: a `system_status` row `worker:contraxis-computer-1` with `status='halt'` makes the worker stop within 5 seconds. A "Halt all agents" command lives in the palette and the CEO console.
- Budget per task and per day in dollars; over budget → stop and report.
- Weekly: review the task reports, revoke anything it didn't need.

## D6. First three tasks to trust it with

1. **Read-only:** "Log into KDP, download this month's royalty report, import it." (Proves browser + login + file + import.)
2. **Write, low stakes:** "Check contraxis.com on mobile and desktop, screenshot every page, list anything broken." (Proves screenshots into the event stream.)
3. **Write with approval:** "Draft a follow-up email to the 5 contractors who didn't respond, show me before sending." (Proves the pause-for-approval loop end to end.)

## D7. Cursor prompts for Part D

### Step 27 — Computer capability in the worker

```
Extend worker/ so a task row can have capabilities text[] (migration 0003). The poll only claims tasks whose capabilities are a subset of WORKER_CAPABILITIES (env, comma-separated).

Add tools under src/tools/computer/:
- browser.open(url), browser.click(selector|text), browser.type(selector, text), browser.read(selector?) → text, browser.screenshot() → uploads PNG to Supabase Storage bucket 'agent-screens' and returns a signed URL; all built on Playwright with a persistent context per project at /data/profiles/<project>. Each tool writes an agent.step event including screenshot_url.
- shell.run(cmd) restricted to a per-task workspace directory, 60 s timeout, output capped at 20 KB, a denylist of destructive commands (rm -rf outside workspace, curl | sh, etc.).
- file.read / file.write within the workspace.
- A sensitive-action detector: if the model is about to call a tool whose description matches purchase/pay/publish/send/delete, the worker sets the task to waiting_approval, creates an approval with the latest screenshot, and resumes after approval. Implement it as a middleware around tool execution, not inside each tool.
- Halt: before every step, read system_status for this worker; if status='halt', stop and set the task to cancelled with reason 'halted'.

Add a Dockerfile.computer with Chromium and Xvfb, and docs/COMPUTER_SETUP.md following BUILD_PLAN Part D4.
```

### Step 28 — The Screen node in the 3D world

```
Add a WorldNode kind 'screen' to the types and to the Contraxis definition, positioned at [0, 3.5, -6]. Render it as a thin 16:9 glass plane (2.4 × 1.35) with a subtle bezel. When a computer task is running for this project, the plane shows the latest screenshot_url from agent.step events as a texture (update on each new event, crossfade 200 ms). Clicking the node opens the context panel with a live view: if the worker exposes a noVNC/WebSocket stream URL (from system_status.detail.screen_url over Tailscale), embed it; otherwise show the screenshot sequence as a strip with timestamps. Show the task title, current step, spent_usd, and a Halt button that writes the halt status. In demo mode the screen shows a placeholder "Agent screen — connects in Part D" and no fake screenshots.
```

---

# PART E — Handoff notes by audience

## For the developer

- Read Parts A (build plan) and C first; D when Phase 1 is demo-complete.
- Own the secrets: Vercel env, Railway env, Supabase keys, Stripe webhook secret. Awad never pastes keys into chat tools.
- Deliver in this order: Phase 1 demo on a Vercel URL → login → Supabase schema and live event source → worker with read tools → CEO creates tasks → email/deploy tools → Stripe → Contraxis events → the computer.
- After each part, send Awad a two-line update and a link. He prefers plain language and short messages.
- Never add a real-money trading path, and never let an agent bypass the approvals table. If a request would require either, stop and ask.

## For Cursor

- The rules file in Section 3 must be present before any prompt is run.
- Run one step at a time. Each step's "Check" list must pass before the next.
- When a step touches Supabase, produce a migration file; never edit tables by hand.
- If a step is ambiguous, prefer the option that keeps the 3D canvas mounted and routes data through the store.

## For the Grok bot (or any other assistant)

Use it as a reviewer and monitor, not a builder:

- It may read this document and the repo, explain any part in plain language to Awad, and draft questions for the developer.
- It may review pull requests against the rules in Section 3 and the safety rules in D5 and flag violations.
- It may draft task instructions for agents; those are submitted through the CEO console like any other command, so they go through the same approvals.
- It must not receive secrets, must not be given write access to Supabase or the worker, and must not be wired in as a tool the agents can call. One AI that can act (the worker) with human approval is the design; a second one acting is not.

---

# APPENDIX A — Original vision document (Awad's words, unchanged)

I want you to build a sophisticated interactive 3D AI Command Center called:

AWAD COMMAND

This is NOT a normal SaaS dashboard.

Do NOT make a grid of cards.

Do NOT make a traditional sidebar-heavy admin panel.

Do NOT make a generic AI dashboard.

The entire point of this project is to create the feeling that I am entering a living digital universe where all of my businesses, AI agents, financial systems, creative projects, and operations exist together.

Think:

Apple-level polish
+
Bloomberg-level information density
+
Three.js interactive 3D
+
a futuristic AI command center
+
a sophisticated strategy game
+
a private billionaire's operating system

The experience should feel expensive, cinematic, intelligent, and extremely interactive.

==================================================
CORE CONCEPT
==================================================

The home screen is a 3D universe.

The user is positioned at the center of the universe.

At the center is:

AWAD

or:

AWAD COMMAND

Around the center are floating 3D PROJECT ORBS.

Each orb represents one of my businesses, projects, financial systems, or creative operations.

Initial project orbs:

APIXIS
LYRIXIS
HALAXIS
RAWIXIS
SOCIXIS
CONTRAXIS
AWADBOT
AWAD PUBLISHING / AMAZON KDP
AWAD STUDIOS / SHOW

More projects should be easy to add later.

The orbs should NOT look like flat circles.

They should look like sophisticated living digital planets / energy spheres.

Each orb should have:

- project name
- subtle 3D geometry
- internal particles
- orbiting particles
- data streams
- activity indicators
- status indicators
- subtle glow
- small pieces of information around it
- animated connections to other projects
- different visual activity based on how active that project is

The universe should continuously have subtle motion.

Nothing should feel static.

==================================================
THE MAIN UNIVERSE
==================================================

The first screen should feel like entering a command center.

Dark background.

Very subtle starfield / particles.

Extremely sophisticated lighting.

Minimal UI.

The project orbs float in 3D space.

Example:

                     ◉ APIXIS

          ◉ HALAXIS              ◉ LYRIXIS


                  ◎ AWAD CEO

       ◉ SOCIXIS                 ◉ CONTRAXIS


                ◉ AWADBOT

          ◉ KDP        ◉ STUDIOS

This is only conceptual.

The actual positions should feel organic and cinematic rather than like a simple diagram.

Allow the user to:

- rotate the universe
- pan
- zoom
- orbit around objects
- click objects
- hover objects
- focus an object
- return to the main universe
- search projects
- filter projects
- enter different visualization modes

Use smooth camera transitions.

When I click a project, the camera should smoothly fly toward that project.

Do not simply open a modal.

I want the world itself to transform.

==================================================
PROJECT ORBS
==================================================

Each orb is a living representation of a project.

For example:

CONTRAXIS

The orb could have:

- contractor-related visual identity
- active data particles
- lead particles flowing toward the core
- revenue particles
- agent activity
- connections to other systems

If a project is highly active:

Increase particle activity.

Increase orbital activity.

Increase subtle energy movement.

If a project is idle:

Reduce activity.

If something needs attention:

Use a sophisticated warning state.

Do NOT make it look like a video game health bar.

Keep it professional.

==================================================
HOVER INTERACTION
==================================================

When the mouse hovers over an orb:

The orb should react.

It should slightly enlarge.

The camera should subtly focus.

A sophisticated translucent information layer should appear.

Example:

CONTRAXIS

MRR
$4,821

REVENUE TODAY
$684

ACTIVE USERS
247

NEW LEADS
82

ACTIVE AI AGENTS
14

CONVERSION
11.2%

STATUS
OPERATIONAL

Do not make this a giant rectangular dashboard card.

Make the information feel like it is part of the 3D environment.

==================================================
CLICKING A PROJECT
==================================================

When I click:

CONTRAXIS

the camera should fly into the Contraxis orb.

The main universe transitions into a Contraxis ecosystem.

The orb becomes a large central CORE.

Around the core are AI agents.

For example:

                    SALES AGENT
                         ○

       MARKETING ○                ○ LEAD AGENT


                  ◎ CONTRAXIS
                      CORE


       ANALYTICS ○               ○ PRODUCT


                    ○ CEO AGENT

These agents should be represented as small intelligent entities / nodes.

They should move around the environment.

They should visibly perform work.

==================================================
THE AI AGENTS MUST FEEL ALIVE
==================================================

This is extremely important.

Do NOT simply display:

"Sales Agent: Online"

Instead, visually represent activity.

Example:

Lead Agent receives a lead.

A particle enters the Contraxis ecosystem.

The Lead Agent moves toward it.

The agent processes it.

The information moves to the CRM node.

Then the Sales Agent receives it.

The Sales Agent processes it.

Then the system shows the result.

For example:

LEAD RECEIVED
↓
QUALIFIED
↓
CONTRACTOR CONTACTED
↓
RESPONSE
↓
JOB WON
↓
REVENUE

I want to WATCH the digital workforce operate.

The animations should represent real system events when real integrations are connected.

Do not fake real business activity.

For the prototype, create simulated/demo activity clearly labeled as DEMO DATA.

==================================================
CONTRAXIS WORLD
==================================================

Build a complete example ecosystem for CONTRAXIS.

Contraxis is a local lead marketplace for contractors.

The ecosystem should contain:

CONTRAXIS CORE

CEO AGENT
SALES AGENT
LEAD GENERATION AGENT
MARKETING AGENT
SEO AGENT
CUSTOMER SUPPORT AGENT
ANALYTICS AGENT
PRODUCT AGENT
DEVELOPMENT AGENT
RESEARCH AGENT

Around them create nodes representing:

CONTRACTORS
CUSTOMERS
LEADS
CRM
WEBSITE
MARKETING
ANALYTICS
REVENUE

Show data flowing between them.

Example:

Customer
→ submits request
→ Lead Agent
→ qualifies lead
→ Contraxis database
→ contractor matching
→ Sales Agent
→ contractor
→ job won
→ revenue

This should visually look like a living digital economy.

==================================================
ANALYTICS
==================================================

When inside a project, analytics should exist INSIDE the environment.

I should be able to activate an:

ANALYTICS MODE

When activated, the environment changes.

The agents remain visible, but analytics begin appearing around the ecosystem.

For Contraxis show:

Revenue
MRR
ARR
Leads
Qualified Leads
Jobs Won
Jobs Lost
Contractors
Customers
Conversion Rate
Customer Acquisition Cost
Lifetime Value
Average Lead Value
Agent Activity
Operating Costs
Profit
Growth Rate

Use sophisticated floating charts.

Use:

- line charts
- circular gauges
- small data panels
- flowing numbers
- trend indicators
- heatmaps
- activity graphs

Do NOT destroy the 3D environment with giant charts.

The analytics should integrate into the world.

==================================================
GLOBAL ECONOMY MODE
==================================================

Create a mode called:

ECONOMY

This shows all projects at once.

Projects become economic nodes.

Revenue flows between systems.

For example:

SOCIXIS
↓
marketing
↓
CONTRAXIS
↓
customers
↓
revenue

APIXIS
↓
technology
↓
CONTRAXIS

KDP
↓
publishing
↓
SOCIXIS
↓
marketing

The connections should be animated.

If a real event occurs, a data particle can travel along the connection.

The purpose is to visualize my entire digital economy.

==================================================
AI WORKFORCE MODE
==================================================

Create:

AI WORKFORCE

This mode shows every AI agent across every project.

For example:

42 ACTIVE AGENTS

APIXIS
7 agents

SOCIXIS
8 agents

CONTRAXIS
14 agents

KDP
6 agents

AWADBOT
5 agents

etc.

I should be able to see which agents are:

WORKING
IDLE
WAITING
BLOCKED
ERROR
NEEDS APPROVAL

Clicking an agent should open its profile.

==================================================
AGENT PROFILE
==================================================

When I click an AI agent:

Show:

AGENT NAME
ROLE
PROJECT
CURRENT TASK
STATUS
TASKS COMPLETED
SUCCESS RATE
LAST ACTION
TIME ACTIVE
TOOLS AVAILABLE
RECENT ACTIONS
CURRENT OBJECTIVE

Example:

CONTRAXIS SALES AGENT

STATUS
WORKING

CURRENT TASK
Analyzing roofing contractors

COMPLETED TODAY
43

CONTACTED
18

RESPONSES
7

CONVERSIONS
3

PROJECTED REVENUE
$450

RECENT ACTIONS

14:31 Researched contractor
14:33 Added contractor to CRM
14:34 Sent outreach
14:37 Response received

==================================================
AWAD CEO
==================================================

The most important AI in the system is:

AWAD CEO

This AI sits above all projects.

The architecture is:

YOU
↓
AWAD CEO
↓
PROJECT CEOs
↓
AI AGENTS
↓
TOOLS / SYSTEMS / DATA

The CEO has access to information from the entire ecosystem.

I should be able to click:

AWAD CEO

and get a sophisticated conversational interface.

I can type OR speak.

Examples:

"What's happening?"

"How much money did we make today?"

"Which business is growing fastest?"

"What's failing?"

"What needs my attention?"

"Why is Contraxis slowing down?"

"What did the bots accomplish overnight?"

"Show me all important emails."

"How are the businesses performing?"

"Compare Socixis and Contraxis."

"Show me everything that made money today."

"Deploy the new Contraxis landing page."

"Have the marketing agents create a campaign."

The CEO should answer based on real connected data when integrations exist.

For demo mode, clearly indicate simulated data.

==================================================
VOICE
==================================================

Add a microphone button.

I should be able to speak naturally.

Example:

I say:

"CEO, what's going on?"

The CEO responds:

"Six projects are currently operational. Forty-two agents are active. Contraxis generated 82 leads today. Socixis published 31 pieces of content. AwadBot is paper trading and is up 1.8 percent today. I have three items that require your attention."

Then I can say:

"Show me the three."

The system should automatically navigate to the relevant projects.

==================================================
MORNING BRIEFING
==================================================

Create a Morning Briefing.

When I log in:

GOOD MORNING, AWAD

The CEO gives me:

BUSINESS PERFORMANCE
FINANCIAL PERFORMANCE
AI ACTIVITY
SALES
IMPORTANT EMAILS
SYSTEM ISSUES
PROJECT GROWTH
RISKS
RECOMMENDATIONS

Example:

6 PROJECTS OPERATIONAL

42 AI AGENTS ACTIVE

REVENUE
$2,481

NEW CUSTOMERS
17

NEW LEADS
82

SYSTEM ISSUES
2

CEO RECOMMENDATION

"Contraxis should be today's priority. Lead volume increased 23%, but contractor conversion decreased 8%."

I can click:

INVESTIGATE

and the system takes me into Contraxis.

==================================================
AWADBOT
==================================================

Create a separate project orb called:

AWADBOT

AwadBot is my personal financial AI.

It is currently PAPER TRADING.

Do NOT connect real-money trading in the prototype.

Show:

PAPER PORTFOLIO
$100,000

TODAY
+$1,284

PERFORMANCE
+1.28%

POSITIONS

RISK

MARKET ANALYSIS

RECENT TRADES

AI CONFIDENCE

The financial ecosystem should contain agents:

MARKET ANALYST
NEWS ANALYST
TECHNICAL ANALYST
RISK MANAGER
PORTFOLIO MANAGER

Make them debate/analyze internally before simulated trades.

==================================================
KDP / PUBLISHING WORLD
==================================================

Create:

AWAD PUBLISHING

This represents my Amazon KDP operation.

Inside:

PUBLISHING CEO
RESEARCH AGENT
IDEA AGENT
WRITER AGENT
EDITOR AGENT
COVER AGENT
MARKETING AGENT
SALES ANALYTICS AGENT

Show books as objects.

Clicking a book should reveal:

TITLE
SALES
ROYALTIES
RANK
REVIEWS
AD PERFORMANCE
MARKETING
STATUS

==================================================
AWAD STUDIOS
==================================================

Create:

AWAD STUDIOS

This represents my entertainment/show operation.

Inside:

IDEA AGENT
STORY AGENT
CHARACTER AGENT
SCRIPT AGENT
DIRECTOR AGENT
ANIMATION AGENT
EDITOR AGENT
MARKETING AGENT

Show a production pipeline:

IDEA
↓
STORY
↓
SCRIPT
↓
CHARACTERS
↓
SCENES
↓
ANIMATION
↓
EDIT
↓
RELEASE
↓
MARKETING

Each stage should have an AI worker.

==================================================
INTER-PROJECT CONNECTIONS
==================================================

The projects should not feel isolated.

They should be connected.

Example:

SOCIXIS ↔ CONTRAXIS

APIXIS ↔ CONTRAXIS

KDP ↔ SOCIXIS

AWAD CEO ↔ EVERYTHING

When a project interacts with another project, show a subtle animated data connection.

==================================================
GLOBAL COMMAND SEARCH
==================================================

Create a command interface.

Keyboard shortcut:

CMD + K

Open:

AWAD COMMAND

I can type:

"Show revenue"

"Show active agents"

"Show Contraxis"

"Show problems"

"Show today's sales"

"Show what happened overnight"

"Open AwadBot"

"Compare businesses"

The command system should navigate the 3D universe.

==================================================
DESIGN LANGUAGE
==================================================

The interface must feel:

Sophisticated
Minimal
Premium
Futuristic
Intelligent
Cinematic
Professional

NOT:

Cartoonish
Cheap
Gamer-like
Overly neon
Cluttered
Generic SaaS
Crypto-dashboard-looking

Use a dark environment with subtle luminous accents.

Think:

black / deep charcoal / graphite

with restrained electric blue, white, silver and subtle project-specific accents.

Use transparency.

Use glass.

Use depth.

Use soft bloom.

Use shadows.

Use subtle particles.

Use smooth camera movement.

Use beautiful typography.

==================================================
3D TECHNOLOGY
==================================================

Use:

React
Next.js
TypeScript
Three.js
React Three Fiber
@react-three/drei
Framer Motion where appropriate
Tailwind CSS
Supabase for backend/realtime architecture

Use Three.js / React Three Fiber for the actual 3D universe.

The official Three.js documentation demonstrates the scene/camera/renderer architecture and animation loop required for this type of application:
https://threejs.org/manual/en/creating-a-scene.html

Use modern best practices.

Do not create an unnecessary custom 3D engine.

==================================================
PERFORMANCE
==================================================

This must be a real usable web application.

Optimize:

- particle counts
- animations
- shaders
- object count
- texture sizes
- render resolution
- mobile behavior

Create quality levels:

HIGH
MEDIUM
LOW

If the device is weak, automatically reduce expensive effects.

The experience should still look excellent.

==================================================
RESPONSIVENESS
==================================================

Desktop is the primary experience.

Optimize specifically for:

MacBook
large monitors
ultrawide monitors

Also provide a usable tablet/mobile fallback.

On mobile, the 3D universe should become a simplified touch-controlled experience.

==================================================
REAL DATA ARCHITECTURE
==================================================

The visual system must eventually connect to real data.

Create a clean architecture for:

Projects
Agents
Agent Tasks
Events
Revenue
Expenses
Customers
Leads
Sales
Messages
Emails
Analytics
Transactions
Deployments
System Status

Use Supabase as the central data layer.

Every meaningful action should generate an event.

Example:

agent.task.started
agent.task.completed
lead.created
lead.qualified
sale.created
payment.received
email.received
deployment.completed
system.error
project.status.changed

These events should power the visual universe.

The 3D interface should not be a fake animation sitting on top of unrelated data.

The data model should drive the animation.

==================================================
EVENT STREAM
==================================================

Create an event stream.

Example:

14:32:01
CONTRAXIS
Lead Agent
Received new roofing lead

14:32:09
CONTRAXIS
Analytics Agent
Updated conversion statistics

14:33:14
SOCIXIS
Content Agent
Published campaign

14:34:22
APIXIS
Development Agent
Completed deployment

14:35:11
AWADBOT
Risk Agent
Updated paper-trading risk model

The user can click an event.

The 3D world should navigate to the relevant project/agent.

==================================================
ACTIVITY LEVEL
==================================================

Each project should have an activity score.

Activity can influence:

particle density
orbital speed
glow intensity
data flow
agent movement

But keep it tasteful.

The system should NEVER look chaotic.

==================================================
STATUS SYSTEM
==================================================

Project status:

OPERATIONAL
ACTIVE
IDLE
ATTENTION
WARNING
ERROR
OFFLINE

Agent status:

WORKING
IDLE
WAITING
BLOCKED
ERROR
NEEDS APPROVAL

Use subtle visual differences.

==================================================
SECURITY
==================================================

This is a private command center.

Authentication must be implemented.

Do not expose API keys in frontend code.

Use server-side secrets.

Use proper authorization.

Do not allow an AI agent to execute destructive actions without authorization.

Create an approval system.

For example:

CEO:
"I recommend deploying this change."

Buttons:

APPROVE
DENY
REVIEW

For financial actions especially, keep strong human approval controls.

==================================================
DEMO MODE
==================================================

VERY IMPORTANT:

Build a complete DEMO MODE first.

I should be able to launch the application and immediately see:

multiple project orbs
multiple active agents
data flowing
analytics changing
events happening
camera animations
project transitions
CEO conversation
simulated revenue
simulated leads
simulated agent activity

The demo must feel alive without requiring external API credentials.

Clearly label simulated data as:

DEMO DATA

Do not pretend demo numbers are real.

==================================================
FIRST EXPERIENCE
==================================================

When the application loads:

Black screen.

Very subtle particles.

AWAD logo/title fades in.

Text:

AWAD COMMAND

Then:

"Initializing AI ecosystem..."

System checks appear:

APIXIS ........ ONLINE
SOCIXIS ....... ONLINE
CONTRAXIS ..... ONLINE
KDP ........... ONLINE
AWADBOT ....... ONLINE
STUDIOS ....... ONLINE
CEO ........... ONLINE

Then the camera pulls backward and reveals the entire 3D universe.

This should feel cinematic.

==================================================
IMPORTANT INTERACTION
==================================================

The entire application should feel like I am physically navigating a digital world.

I don't want:

CLICK CARD → OPEN PAGE

I want:

CLICK ORB → CAMERA FLIES THROUGH SPACE → PROJECT WORLD APPEARS

Then:

CLICK AGENT → CAMERA FOCUSES AGENT

Then:

CLICK EVENT → FOLLOW DATA

Then:

CLICK CEO → ENTER EXECUTIVE COMMAND CENTER

Everything should feel connected.

==================================================
VISUAL REFERENCES
==================================================

Use these concepts as inspiration:

1. Futuristic data command center:
https://getspike.ai/blog/how-spike-ai-works/

2. Interactive 3D data visualization:
https://threejs.org/examples/

3. Three.js scene architecture:
https://threejs.org/manual/en/creating-a-scene.html

4. Three.js useful examples/resources:
https://threejs.org/manual/en/useful-links.html

5. Futuristic network/data sphere aesthetic:
https://www.ielts.net/microcycle/

Do NOT copy these designs.

Use them only to understand the visual language:

3D
depth
glowing nodes
data visualization
holographic interfaces
interactive networks
cinematic command centers

==================================================
MOST IMPORTANT DESIGN RULE
==================================================

If you are deciding between:

A traditional dashboard

and

an interactive 3D operating environment,

ALWAYS choose the interactive 3D operating environment.

This is supposed to feel like an operating system for an AI-powered business empire.

==================================================
BUILD PRIORITY
==================================================

Do NOT attempt to build every backend integration first.

Build the visual experience first.

PHASE 1:

1. 3D universe
2. Project orbs
3. Camera controls
4. Hover interactions
5. Click-to-enter project
6. Contraxis ecosystem
7. Animated AI agents
8. Demo data
9. Analytics
10. CEO interface
11. Event stream

PHASE 2:

12. Supabase
13. Real-time events
14. Project database
15. Agent database
16. Task database
17. Authentication

PHASE 3:

18. Business integrations
19. Email
20. Sales
21. KDP
22. Financial systems
23. AI agent execution
24. Real CEO orchestration

==================================================
DO NOT STOP AT A MOCKUP
==================================================

I want you to actually build the working application.

Start with the highest-quality functional prototype possible.

The first version should already feel impressive when I open it.

Make the 3D universe the centerpiece.

Make CONTRAXIS the most complete example world.

Make the CEO interactive.

Make the agents visibly work.

Make the transitions beautiful.

Make the system architected so additional projects can be plugged in without rebuilding the entire application.

The ultimate goal is:

I log into AWAD COMMAND.

I see my entire AI ecosystem.

I click a project.

I enter that world.

I see its AI workforce.

I see its business.

I see its money.

I see its analytics.

I see its activity.

I can talk to its CEO.

Then I can return to the global universe.

And I can talk to one master AI CEO that understands everything.

Build that experience.

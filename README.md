# AWAD COMMAND

Private 3D AI command center for Awad (Apixis Dev). The universe **is** the UI — project worlds, not a card grid.

Visual V2: each company is a distinct 3D entity (shell, silhouette, rings, particles) around a dominant AWAD CEO core. Click flies through the shell into the internal ecosystem. Contraxis is the showcase world — Customer → Lead Gen → Qualification → Database → Matching → Sales → Contractor → Job → Revenue — with moving agents and a Follow path. Safari now renders the canvas (postprocessing stays off on WebKit).

Mood reference (not app code): [public/awad-command-preview.html](public/awad-command-preview.html)  
Master handoff: [docs/MASTER_HANDOFF.md](docs/MASTER_HANDOFF.md)

## Run locally

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Dev server: [http://localhost:43180](http://localhost:43180)

```bash
pnpm typecheck
pnpm lint
```

The demo deck stays **open** until `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `ALLOWED_EMAIL` are all set. Then magic-link login gates the site to that email.

## Lead bots on the orbs

Every product orb is wired in `src/config/orbLeads.ts` and its project plugin under `src/projects/<slug>/`.

| Orb | Lead | Agent id |
|---|---|---|
| contraxis | Contraxis Lead | `d4261445-439f-419e-9c3d-7db2d769676f` |
| socixis | Socixis Lead | `8e5056f3-642b-42ec-9c3b-b17803afa2ac` |
| lyrixis | Lyrixis Lead | `b92c8845-aa75-445f-8156-bf2e8c51a9a3` |
| halaxis | Halaxis Lead | `7da5afaa-d04a-44f3-8d0c-695260264161` |
| rawixis | Rawixis Lead | `ab3f9f13-6c25-410d-b941-410e1aa6f276` |
| awadbot | AwadBot Lead | `4288dd32-bca5-413e-8636-5651e41ef3bf` |
| apixis | Apixis Lead | `fa4ded99-57a0-4963-b55f-4e6439348591` |
| nursery-toons | Nursery Toon Lead | `a769a50c-c92e-4e3e-ad0f-00eb45c175d2` (coming soon) |
| qahwahworld | Qahwahworld Lead | `bf8167e3-fc00-466b-9025-ef5fe0e7fbda` (coming soon) |

Developer Bot and Dashboard Lead are **system contacts** in the same config — not fake orbs.

Click an orb → ProjectWorld HUD shows the lead name + agent id and a **Message lead** panel.

## Live lead messaging (hub keys)

`POST /api/lead-message` `{ projectSlug, message }` runs **server-side only**.
The route resolves `agentId` from `src/config/orbLeads.ts`. Demo works with no keys.

Hub contract (outbound):

```http
POST $LEAD_MESSAGE_WEBHOOK_URL
Authorization: Bearer $LEAD_MESSAGE_WEBHOOK_SECRET
Content-Type: application/json

{ "agentId": "<uuid>", "message": "<text>", "projectSlug": "<slug>" }
```

Header chosen: **`Authorization: Bearer`** (not `X-Webhook-Secret`).

1. Set `LEAD_MESSAGE_WEBHOOK_URL` and `LEAD_MESSAGE_WEBHOOK_SECRET` (or alias `GROK_BOT_API_KEY`).
2. Delivery is claimed **only** after the webhook returns 2xx. Non-2xx is surfaced as failed.
3. If the webhook is unset, the message is queued in the deck and tagged DEMO. No OAuth to Grok Bot Chat.

### Inbound — Lead reply → COMMAND thread

After a product Lead answers in Grok Bot Chat, Developer Bot (or the hub routine) POSTs the reply here so it appears in that orb’s Message lead panel.

```http
POST https://<command-host>/api/lead-inbound
Authorization: Bearer $LEAD_INBOUND_WEBHOOK_SECRET
Content-Type: application/json

{ "agentId": "<uuid>", "message": "<lead reply>", "projectSlug": "<optional>", "leadName": "<optional>" }
```

- Auth secret: `LEAD_INBOUND_WEBHOOK_SECRET` if set, otherwise the same `LEAD_MESSAGE_WEBHOOK_SECRET` (or `GROK_BOT_API_KEY`) used outbound. Missing or wrong Bearer → **401**.
- Resolve order: `agentId` (orb map) then `projectSlug`. Unknown lead → **404**.
- The deck polls `GET /api/lead-thread?projectSlug=<slug>` while the panel is open (every few seconds). No page reload.
- Replies persist in process memory and, when `SUPABASE_SERVICE_ROLE_KEY` is set, in `awad_command.lead_messages` plus an `awad_command.events` row (`lead.message.replied`).

## CEO (text + voice + tools)

`POST /api/ceo` — **live CEO needs `AI_PROVIDER=anthropic` (case-insensitive) and a non-empty `ANTHROPIC_API_KEY`** (optional `ANTHROPIC_MODEL`). Demo is used only when Anthropic is not selected. If the Anthropic call fails, the JSON returns `provider: "error"` plus an `error` field — it does not silently fall back to the demo responder.

The CEO is an orchestrator, not text-only advice. It can call:

| Tool | Where it runs | What it does |
|---|---|---|
| `message_lead` | Server | Same outbound helper as `POST /api/lead-message` (`{ agentId, message, projectSlug }` + Bearer). |
| `navigate` | Client | Fly the camera to a project / agent / mode. |
| `open_panel` | Client | Open a HUD panel (including Message lead). |
| `propose_approval` | Client | Record-only approval card. Never spend / publish / delete / live trade. |
| `create_task` | Server | Inserts `awad_command.agent_tasks` (queued) or `approvals.pending` + `waiting_approval`. |

Ask something like “tell Contraxis Lead to ping me” and the CEO actually sends. The reply is honest: **delivered**, **queued (DEMO)**, or **failed**. Unknown slugs are errors — never fake success.

`create_task` is how the CEO queues real agent work. Money or public-facing changes set `requiresApproval=true`. Approve / Deny on the card runs a **server action** (service role) that updates both the approval and the task. When the worker finishes, Realtime posts `Report: …` into the CEO console. With no `SUPABASE_SERVICE_ROLE_KEY`, create/approve stay local DEMO and the worker does not run.

The hub still owns the reverse hop. Lead replies appear in Message lead only after the hub POSTs `/api/lead-inbound`. COMMAND does not pull Grok for answers.

Voice (Chrome / Safari Web Speech API):

- Tap the mic on the CEO console to start/stop listening. Interim speech shows in the input; a final phrase is submitted to `/api/ceo`.
- Spoken replies use `speechSynthesis` and are **on by default**. Mute with the speaker control (store `voiceMuted`) or ⌘K → Mute CEO voice.
- If `SpeechRecognition` is missing (Firefox, old Safari, insecure origin), the shell stays up and a short HUD hint says to type instead.

## Supabase

Shared project: `https://myfclypikkcvfurkbzmj.supabase.co`  
Schema: `awad_command` (clients set `db.schema = "awad_command"`).  
Migration copy (docs): `supabase/migrations/0001_part_b.sql`.  
Part C task loop: `supabase/migrations/0002_tasks.sql` — extends the **existing** live `awad_command.approvals` table (does not create a second one) and adds `agent_tasks` + whitelist views.

## Worker (Part C)

Always-on process in `worker/`. Deploy on Railway with root directory `worker`. Env list:

- `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `WORKER_MODEL` (default `claude-sonnet-5`)
- `WORKER_ID` (default `awad-worker-1`)

Details: [worker/README.md](worker/README.md). Apply `0002_tasks.sql` on the shared Contraxis project before the worker can claim rows.

## Computer (Part D, first slice)

The Computer panel is honest: **coming online** until a worker heartbeats with `WORKER_CAPABILITIES=computer` and posts a screenshot. It never invents a frame. Optional `NEXT_PUBLIC_COMPUTER_STUB_SCREEN_URL` is labeled stub.

- Migration: `supabase/migrations/0003_computer.sql` (`capabilities` on `agent_tasks`, `awad_command.agent_screens`, claim RPC, `agent-screens` bucket note).
- Worker tools: `computer.screenshot` (read), `computer.navigate` (write).
- Local / Railway: [docs/COMPUTER_SETUP.md](docs/COMPUTER_SETUP.md). Image: `worker/Dockerfile.computer` (Chromium + Xvfb).
- Safety: agent accounts only; purchase / publish / delete / send-to-customer pause for Approve; Phase 1 Approve is record-only for money / destructive.

Still needed for a live screen: a VM or Railway service with `WORKER_CAPABILITIES=computer` talking to this hub. The 3D universe is unchanged aside from a Contraxis Screen node that opens the same panel.

## Vercel

1. Import this repo.
2. Framework: Next.js. Install: `pnpm install`. Build: `pnpm build`.
3. Copy this env list into the Vercel project (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ALLOWED_EMAIL`
   - `AI_PROVIDER`
   - `ANTHROPIC_API_KEY`
   - `ANTHROPIC_MODEL`
   - `LEAD_MESSAGE_WEBHOOK_URL`
   - `LEAD_MESSAGE_WEBHOOK_SECRET`
   - `LEAD_INBOUND_WEBHOOK_SECRET` (optional; defaults to the outbound secret)
   - `GROK_BOT_API_KEY` (optional alias for the webhook secret)
   - `NEXT_PUBLIC_SITE_URL` (production URL for magic-link redirects)
4. Set `ALLOWED_EMAIL` last — the deck stays public demo until URL + anon + email are all present.

## Hard rules

1. 3D universe is the interface.
2. Every number goes through `<Metric>` and is tagged DEMO unless live.
3. No real spend / publish / delete / trade without Approve (record only tonight).
4. Secrets stay on the server.

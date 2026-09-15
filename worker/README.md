# AWAD worker

Always-on Node 20 process that claims `awad_command.agent_tasks`, runs an Anthropic tool-use loop, and writes events + a human `report`. Nothing money-moving or destructive runs unless the task has an **approved** `approvals` row.

This package is standalone (its own `package.json`) so Railway can deploy the `worker/` folder as the root.

## Local

```bash
cd worker
cp ../.env.example .env   # or export the vars below
pnpm install
pnpm test
pnpm typecheck
pnpm dev
```

Smoke test (needs live keys + migration `0002_tasks.sql` applied):

1. Upsert project `contraxis` and agent `contraxis.analytics-agent`.
2. Insert a `queued` task with instruction `Summarise today's leads and conversion`.
3. Watch stdout JSON: `agent.task.started` → `agent.step` → `agent.task.completed`.
4. `agent_tasks.report` should be filled; CEO console shows `Report: …` when Realtime is on.

## Railway

1. New service → deploy from this GitHub repo.
2. **Root directory:** `worker`
3. Builder: Dockerfile (this folder’s `Dockerfile`) or Nixpacks (`pnpm build` / `pnpm start`).
4. Restart policy: always. One replica is enough.
5. Set the env list, then apply `supabase/migrations/0002_tasks.sql` on the shared Contraxis project if it is not applied yet.

### Env list

| Name | Required | Notes |
|---|---|---|
| `SUPABASE_URL` | yes | Same project as COMMAND. Alias: `NEXT_PUBLIC_SUPABASE_URL`. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | **Server only.** Never put this in the Next client. |
| `ANTHROPIC_API_KEY` | yes | Worker model loop. |
| `WORKER_MODEL` | no | Default `claude-sonnet-5`. |
| `WORKER_ID` | no | Default `awad-worker-1`. Heartbeat key is `worker:<id>`. |
| `AWAD_COMMAND_SCHEMA` | no | Default `awad_command`. |
| `WORKER_POLL_MS` | no | Default `3000`. |
| `WORKER_LEASE_MS` | no | Default `600000` (10 minutes). |
| `WORKER_HEARTBEAT_MS` | no | Default `30000`. |
| `WORKER_MAX_STEPS` | no | Default `25`. |
| `WORKER_CAPABILITIES` | no | Comma list. Empty = API worker (claims tasks with no capabilities). Set `computer` on a Chromium box. |
| `WORKER_DATA_DIR` | no | Default `/data`. Profiles at `$WORKER_DATA_DIR/profiles/<project>`. |
| `WORKER_COMPUTER_HEADED` | no | `1` for a headed Chromium (local only). |

Computer / Xvfb setup: [docs/COMPUTER_SETUP.md](../docs/COMPUTER_SETUP.md). Image: `Dockerfile.computer`.

## Tools (this drop)

| Tool | Risk | Guard |
|---|---|---|
| `supabase.query` | read | Whitelist views only: `v_leads`, `v_sales`, `v_events`, `v_metrics`. |
| `http.fetch` | read | GET, 1 MB, 10 s, blocks private / link-local / metadata IPs. |
| `computer.screenshot` | read | PNG of the agent browser. Requires `WORKER_CAPABILITIES=computer`. |
| `computer.navigate` | write | Open a public URL. Needs a human task or approved plan. Checkout / pay / publish / delete / send-to-customer pause. |

`money` / `destructive` tools refuse to run in Phase 1 (Approve is record-only). `write` tools run only for a human-created task or an approved plan. Computer tools are registered only when `WORKER_CAPABILITIES` includes `computer`.

## Halt / SIGTERM

`SIGTERM` / `SIGINT` release the in-flight task back to `queued` so another worker can claim it after the lease logic. A `system_status` row `worker:<WORKER_ID>` is upserted every 30s with `status=online`. If that row is `halt`, the worker stops claiming and cancels the in-flight task. Heartbeat will not overwrite `halt` back to `online`.

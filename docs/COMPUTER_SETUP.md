# Computer worker setup

First slice of Part D. This is the path a worker uses to drive a browser. It does **not** spend, publish, trade, or use Awad’s personal logins.

## What this slice ships

- `WORKER_CAPABILITIES` (comma-separated). A computer box sets `computer`.
- Claim filter: a task’s `capabilities` must be a subset of the worker’s. Empty task capabilities stay claimable by an API worker.
- Tools: `computer.screenshot` (read) and `computer.navigate` (write — human task or approved plan).
- Playwright Chromium with a persistent profile per project at `$WORKER_DATA_DIR/profiles/<project>`.
- The worker keeps that Chromium context/page open across tool calls. `computer.screenshot` captures the current URL; it does not launch a new blank tab.
- Screenshots → private Storage bucket `agent-screens` (signed URL) or a local file under `$WORKER_DATA_DIR/screens/`. `agent_screens.page_url` is stored so the Computer status API can skip a newer `about:blank` frame when the same task already has content.
- Sensitive-action middleware pauses purchase / publish / delete / send-to-customer.
- Halt: `system_status.project_slug = worker:<WORKER_ID>` with `status=halt`.
- Computer panel shows a real screenshot URL when one exists; otherwise it stays **coming online**.

## What still needs a real VM / Railway

The hub does not run Chromium. Until a process heartbeats with `WORKER_CAPABILITIES=computer`, the Screen / Computer panel will not show a live frame.

Still missing after this slice:

1. A Linux VM (or Railway service from `worker/Dockerfile.computer`) that stays on.
2. Apply `supabase/migrations/0003_computer.sql` and `0004_agent_screens_page_url.sql` on the shared Contraxis project (`awad_command`).
3. Confirm Storage bucket `agent-screens` exists (the migration inserts it when `storage.buckets` is present; otherwise create it in the dashboard — private, PNG/JPEG, 5 MB).
4. Tailscale / noVNC if you want a live stream in `system_status.detail.screen_url`. This slice does not embed noVNC.
5. Agent-only Google / KDP / supplier accounts. Never copy Awad’s personal logins onto the box.
6. `browser.click` / `browser.type` / `shell.run` / `file.*` — not in this slice.
7. Phase 1 Approve is **record-only** for money / destructive. Approve on a purchase card does not execute it.

## Local (Xvfb + Playwright)

```bash
cd worker
pnpm install
npx playwright install chromium
export SUPABASE_URL=https://myfclypikkcvfurkbzmj.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=   # server only
export ANTHROPIC_API_KEY=
export WORKER_ID=contraxis-computer-1
export WORKER_CAPABILITIES=computer
export WORKER_DATA_DIR=$PWD/data
export AWAD_COMMAND_SCHEMA=awad_command

# headed (your machine has a display)
# WORKER_COMPUTER_HEADED=1 pnpm dev

# headless / CI / no display
xvfb-run -a -s "-screen 0 1280x720x24" pnpm dev
```

Smoke:

1. Apply `0003_computer.sql` and `0004_agent_screens_page_url.sql`.
2. Insert a `waiting_approval` → Approve (or `source=human`) task with `capabilities = '{computer}'` and instruction `Screenshot https://contraxis.com`.
3. After navigate + screenshot (and a second standalone screenshot in the same task), `awad_command.events.payload.screenshot_url` and `awad_command.agent_screens` should fill. Both frames should show the navigated page, not `about:blank`.
4. Open Computer in the deck. The panel shows that URL or stays coming online if the worker never heartbeated.

## Docker / Railway

```bash
docker build -f worker/Dockerfile.computer -t awad-computer worker
docker run --rm -e SUPABASE_URL -e SUPABASE_SERVICE_ROLE_KEY -e ANTHROPIC_API_KEY \
  -e WORKER_ID=contraxis-computer-1 -e WORKER_CAPABILITIES=computer \
  -v awad-computer-data:/data awad-computer
```

Railway: new service, root `worker`, Dockerfile path `Dockerfile.computer` (not the API `Dockerfile`). One replica. Volume on `/data` so profiles survive restarts.

## Env list (computer worker)

| Name | Required | Notes |
|---|---|---|
| `SUPABASE_URL` | yes | Alias `NEXT_PUBLIC_SUPABASE_URL`. Schema `awad_command`. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server only. Uploads to `agent-screens`. |
| `ANTHROPIC_API_KEY` | yes | Worker model loop. |
| `WORKER_ID` | yes for computer | Example `contraxis-computer-1`. Heartbeat key `worker:<id>`. |
| `WORKER_CAPABILITIES` | yes for computer | `computer`. Without this, computer tools are not registered. |
| `WORKER_DATA_DIR` | no | Default `/data`. Profiles at `$WORKER_DATA_DIR/profiles/<project>`. |
| `WORKER_MODEL` | no | Default `claude-sonnet-5`. |
| `AWAD_COMMAND_SCHEMA` | no | Default `awad_command`. |
| `WORKER_POLL_MS` | no | Default `3000`. |
| `WORKER_LEASE_MS` | no | Default `600000`. |
| `WORKER_HEARTBEAT_MS` | no | Default `30000`. |
| `WORKER_MAX_STEPS` | no | Default `25`. |
| `WORKER_COMPUTER_HEADED` | no | `1` to launch Chromium headed (local debug). |

Hub (Next) optional:

| Name | Notes |
|---|---|
| `NEXT_PUBLIC_COMPUTER_STUB_SCREEN_URL` | Optional http(s) image used only when no live screenshot exists. Labeled stub. Never a fake business metric. |

## Safety that does not bend

- Agent accounts only. Awad’s personal Google / bank / Apple IDs never live on this machine.
- `computer.screenshot` is read. `computer.navigate` is write.
- Purchase, publish, delete, send-to-customer → task goes `waiting_approval` with the latest screenshot. Phase 1 Approve records the decision; money / destructive tools still do not run.
- Halt from the Computer panel or ⌘K → Halt agents.
- No Stripe tools in this slice.

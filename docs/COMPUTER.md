# Computer — first slice

The agents’ own machine is Part D of `docs/MASTER_HANDOFF.md`. The deck no longer lies about a finished browser: it shows a **coming online** panel until a computer worker heartbeats, and a real screenshot when storage or a stub URL exists.

Nothing here spends, publishes, or deletes. Phase 1 Approve is record-only for money / destructive.

## What it is now

- A worker with `WORKER_CAPABILITIES=computer`
- Playwright Chromium + a persistent profile per project under `$WORKER_DATA_DIR/profiles/<project>`
- First tools: `computer.screenshot` (read) and `computer.navigate` (write — needs a human task or an approved plan)
- A Screen node in Contraxis (16:9 glass). Click opens Computer. No fake textures in demo.
- Screenshots into the private `agent-screens` bucket (schema notes in `awad_command.agent_screens`)
- Halt via `system_status` — never a silent continue

## Safety that does not bend

- Its own accounts. Awad’s personal logins never live on it.
- Purchase, publish, delete, or send-to-customer steps pause for Approve.
- Phase 1 Approve is **record only** for money / destructive. Nothing executes from the card.

## First three tasks (when the worker exists)

1. Read-only: KDP royalty report import
2. Low-stakes write: screenshot Contraxis on mobile and desktop
3. Write with approval: draft contractor follow-ups, show before send

## Run it

See [COMPUTER_SETUP.md](./COMPUTER_SETUP.md) for Xvfb / Playwright / Railway / env list.

Honest gap: the hub still needs a real VM or Railway service with `WORKER_CAPABILITIES=computer` before the Screen shows a live frame. This repo only scaffolds that path.

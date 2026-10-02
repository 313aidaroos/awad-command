# AGENTS.md — Awad Command


## Crypto Floor robot (active, v2 since 2026-10-02)
Before any Crypto Floor work: read `docs/crypto-floor/ROBOT-SPEC.md` top to bottom (status block first) and `NOTES/CLAUDE.md`. It is Awad's decided spec and the live status channel from @hermes (Bot Chat delivery to this profile is unreliable). Paper money only.
- Engine: `src/lib/crypto-floor/` — `engine.ts` (pure planner, tested) + `tick.ts` (runner, cron every 5 min). Four desks, one strategy each, each on its own ledger (`crypto_floor_orders`). Never read desk positions from Alpaca's position list (shared account).
- Guardrails live in code, never in an AI: kill switch, day-loss pauses, bounds in `strategies.ts`. Desk agents (chat) may backtest and run SHADOW tests only; promoting, desk on/off, kill switch and orders are owner-only routes.
- Daily review + email: `/api/crypto-floor/review` (cron 13:00 UTC). Schema: `supabase/migrations/20261002000000_crypto_floor_robot_v2.sql`.
- REAL MONEY = Coinbase (`coinbase.ts`, `live.ts`, `liveRun.ts`). OFF for every desk until Awad switches one on in the UI. Never enable it, raise its limits, or add a code path that does, without Awad's explicit instruction. Never use a Coinbase key that has Transfer permission.
- Log every floor change (code, env, DB, deploy) in `AI_CHANGELOG.md` and your `NOTES/<BOT>.md`.

## AI change log (owner's standing rule)
Any AI model, bot, or agent that changes anything in this repo must append a dated entry to AI_CHANGELOG.md (what changed + why). No exceptions.

# AGENTS.md — Awad Command


## Crypto Floor robot (active, v2 since 2026-10-02)
Before any Crypto Floor work: read `docs/crypto-floor/ROBOT-SPEC.md` top to bottom (status block first) and `NOTES/CLAUDE.md`. It is Awad's decided spec and the live status channel from @hermes (Bot Chat delivery to this profile is unreliable). Paper money only.
- Engine: `src/lib/crypto-floor/` — `engine.ts` (pure planner, tested) + `tick.ts` (runner, cron every 5 min). Six desks, one strategy each, each on its own ledger (`crypto_floor_orders`). Never read desk positions from Alpaca's position list (shared account).
- RONIN (5th desk, since 2026-10-02) is the higher-risk team: it writes its own strategies in the rule language `strategy/custom-v1.ts` (stored in `crypto_floor_desks.spec`), 8 coins, ≤10%/trade, ≤4 positions, stop mandatory, desk day-loss −5% (`crypto_floor_desks.risk`). Limits are `RONIN_LIMITS` in code — an AI never widens them.
- CYCLE (6th desk, since 2026-10-03, Awad's idea): `strategy/cycle-straddle-v1.ts` — Mondays only, one long ATM straddle (~4 weeks) on SPY/QQQ + stocks with a detected ~15-trading-day cycle; each leg sells at +50%, the rest at −50% combined or trading day 15; max $500 debit per straddle (`STRADDLE_MAX_DEBIT_USD`), max 4 open; long premium only; paper only, no lab backtests.
- Every team learns on its own: hourly team meetings (`research.ts`, cron `/api/crypto-floor/research` at :20; RONIN every other hour, core teams 3×/day, all-hands of the six leads 11:20 UTC), team journals (`crypto_floor_notes`), training (`training.ts` — role playbooks, cross-training, team playbooks; append to `TRAINING_UPDATES` whenever you change it). A team may ADOPT a change on its own PAPER desk only through `lab.ts adoptChange` (code-checked evidence gate, 1 per desk per 24h). A desk with real money on only PROPOSES.
- Guardrails live in code, never in an AI: kill switch, day-loss pauses, bounds in `strategies.ts`, `RONIN_LIMITS`, the evidence gate. Agents never place orders, switch desks, use the kill switch or touch real money.
- Daily review + email: `/api/crypto-floor/review` (cron 13:00 UTC). Schema: `supabase/migrations/20261002000000_crypto_floor_robot_v2.sql`.
- REAL MONEY = Coinbase (`coinbase.ts`, `live.ts`, `liveRun.ts`). OFF for every desk until Awad switches one on in the UI. Never enable it, raise its limits, or add a code path that does, without Awad's explicit instruction. Never use a Coinbase key that has Transfer permission.
- Log every floor change (code, env, DB, deploy) in `AI_CHANGELOG.md` and your `NOTES/<BOT>.md`.

## AI change log (owner's standing rule)
Any AI model, bot, or agent that changes anything in this repo must append a dated entry to AI_CHANGELOG.md (what changed + why). No exceptions.

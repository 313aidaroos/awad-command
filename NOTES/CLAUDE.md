Claude notes. Every change Claude makes to this product (code, env, database, deploys) gets a dated entry here so Grok Bot, Hermes, Codex and Claude stay on the same page. Same format as NOTES/GROK.md.

## 2026-10-02 (UTC) — Claude: Crypto Floor robot v2 (branch `claude/gracious-brahmagupta-2w2bcc`)

Asked by Awad: fix everything found in the crypto-floor audit, make it trade 24/7, four teams testing strategies, talk to the desk leads, daily email to awad@apixis.dev, everything visible in the command center.

### Why it never traded (audit, verified on the hub DB before any change)
- The cron WAS firing every 5 min (12 tick snapshots/hour), but in its whole life the robot logged 18 events, 0 orders submitted, 0 fills, 0 entry signals. Last event 2026-09-29 14:09 UTC.
- Bars bug: `limit=2` with no `start` → Alpaca defaults to the start of the UTC day, so "1h return" was the 00:00→01:00 hour all day. Also requested `BTCUSD` but read the response by that key (v1beta3 keys are `BTC/USD`).
- dip-v1 (Awad's buy-the-dip) was written but never called by the tick.
- `crypto_floor_events.order_id` was UNIQUE → `order_filled` could never be written after `order_submitted` (same client_order_id).
- The robot shares the Alpaca paper account with AwadBot (stocks, options, ~25 crypto dust positions). Account equity drove the day-loss halt; Alpaca nets one position per coin, so bots would sell each other's coins.
- Day-loss halt set `halted=true` and never resumed. Manual order button used `time_in_force: "day"` (Alpaca rejects it for crypto). Manual-order event logging wrote old-schema columns that do not exist. Two migrations created `crypto_floor_events` with different schemas. `crypto_floor_params` + `strategy` column existed live with no migration. UI polled every 5 s and inserted a snapshot row per poll (1000-row cap wiped the start-of-day baseline). Tick route authorized `Bearer undefined` if CRON_SECRET was unset.

### Database (Supabase hub `myfclypikkcvfurkbzmj`) — APPLIED LIVE 2026-10-02 ~05:40 UTC
- Migration `crypto_floor_robot_v2` = `supabase/migrations/20261002000000_crypto_floor_robot_v2.sql`. Additive only; no rows changed or deleted.
- `crypto_floor_params`: + halt_reason, halted_at, halted_by, day_paused_until, day_pause_reason, max_open_positions_total (8), max_orders_per_tick (3), tick_lease_until, tick_lease_holder. `halted` stays the master kill switch (currently false). Legacy momentum columns kept but unused.
- `crypto_floor_events`: UNIQUE(order_id) dropped → unique index on (type, order_id). `strategy` column now in a migration.
- New tables (RLS on, service role only): `crypto_floor_desks` (seeded: samurai=momentum-v1, neon=dip-v1, orbit=swing-v1, phantom=breakout-v1; $25k paper capital each; samurai seeded with the live v1 params), `crypto_floor_orders` (the ledger), `crypto_floor_daily` (start-of-day equity per book), `crypto_floor_reports` (one per day, email claim), `crypto_floor_messages` (owner ↔ desk agent chat), `crypto_floor_experiments` (shadow strategy tests), `crypto_floor_param_changes` (every param change with before/after).
- `20260928010000_crypto_floor_events.sql` is now a no-op (it created the wrong events schema on a fresh DB).
- Undo: the new tables can be dropped; nothing existing depends on them. Old v1 code keeps working against the new schema.

### Code (needs merge to master to go live — production still runs the v1 tick until then)
- Engine: `src/lib/crypto-floor/` — `engine.ts` (pure planner, unit-tested), `tick.ts` (runner), `alpaca.ts`, `ledger.ts`, `market.ts`, `strategies.ts` (+ new `strategy/swing-v1.ts`, `strategy/breakout-v1.ts`), `store.ts`, `events.ts`, `review.ts`, `report.ts`, `dailyReport.ts`, `backtest.ts`, `lab.ts`, `agentChat.ts`, `state.ts`.
- Routes: `/api/crypto-floor/tick` (cron, 5 min), `/api/crypto-floor/review` (cron daily 13:00 UTC = 8 AM Central; owner POST = send now), `/snapshot` (DB only), `/control` (owner: kill switch, desk on/off, start/stop/promote tests), `/lab` (owner backtests), `/chat` (owner ↔ desk agents), `/place-order` (fixed), `/events` (owner read).
- Each desk trades its own ledger; sells are capped by what Alpaca can deliver; one open order per desk+coin; single-leader tick lease; reconcile by client_order_id before acting.

### Env (Vercel, awad-command) — nothing changed by Claude
- Uses existing: ALPACA_API_KEY/SECRET, TRADE_MODE=paper, CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY (+ANTHROPIC_MODEL), RESEND_API_KEY.
- Optional new: `CRYPTO_FLOOR_ALPACA_API_KEY` / `CRYPTO_FLOOR_ALPACA_SECRET_KEY` (separate paper account for the floor — recommended), `CRYPTO_FLOOR_REPORT_EMAIL` (default awad@apixis.dev), `CRYPTO_FLOOR_EMAIL_FROM`.

### Ownership
- Hermes owns the floor robot (AGENTS.md). Spec: `docs/crypto-floor/ROBOT-SPEC.md` (status block updated). Paper money only.

### Later on 2026-10-02 (before the first push)
- Fixed after review: positions close when less than 1% of cost is left (Alpaca takes crypto fees in the coin), stale data blocks only the stale coin (trade freshness 2h, bar freshness 3h), stale-data events at most once an hour, lease filter quoting.
- Checks run: `pnpm typecheck` clean, `pnpm test` 244 app + 55 worker tests pass, `pnpm lint` no errors, `pnpm build` passes. UI checked in a headless browser (desktop 1440px + phone 390px) with fixture data.
- NOT yet verified live: a real tick, a real Alpaca paper order, the Resend email and the Anthropic chat run only after the branch is merged and Vercel deploys. First things to check after deploy: `crypto_floor_events` gets a `heartbeat` every 5 min; the robot bar on /crypto-floor says RUNNING.
- Pushed: commit 45ffdb6 on `claude/gracious-brahmagupta-2w2bcc` (Vercel preview builds it; production stays on master until merged).

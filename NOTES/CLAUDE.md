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

## 2026-10-02 06:05 UTC — Claude: robot v2 LIVE on production
- Merged: PR #45 (squash `f04de95`) to master by Awad's instruction ("merge to master"). Vercel production deploy `dpl_E6hbYdYULjhh8FSXWDmJhntpz3Km` READY.
- First v2 tick 06:05:40 UTC: heartbeat written, no errors, 1.9 s. Real data from the last closed hour (05:00 bar): BTC $86,032, ETH $2,725, SOL $121.98. All four desks enabled, $25k each, no entry blocks. Daily baselines written for samurai/neon/orbit/phantom/floor; lease released; snapshot row written.
- 0 orders on the first tick is correct: no setup (last hour −0.7…−1.3%, 24h +0.3…+2.2%, ~1% under the 24h high, no EMA cross, no volume breakout).
- Still to see live: first Alpaca paper order (when a setup appears), first daily email (13:00 UTC), first desk chat reply (needs ANTHROPIC_API_KEY on Vercel), Resend (needs RESEND_API_KEY on Vercel).
- How to check the robot: `select ts, payload->>'title' from crypto_floor_events order by ts desc limit 20;` — a `heartbeat` every 5 minutes means it is alive.

## 2026-10-02 ~07:00 UTC — Claude: Coinbase (REAL MONEY) connected-ready, OFF
- Awad's decision: "Connected, real trading OFF"; "keep it on Alpaca for now and when it's ready I'll flip it to live".
- DB (hub `myfclypikkcvfurkbzmj`), APPLIED: migration `crypto_floor_coinbase` = `supabase/migrations/20261002010000_crypto_floor_coinbase.sql`. Adds `crypto_floor_desks.live_enabled` (all false), `crypto_floor_params.live_max_total_usd=100 / live_max_trade_usd=25 / live_day_loss_usd=10 / live_paused_until`, `crypto_floor_orders.mode` now allows `live`, plus `venue` / `venue_order_id` / `fees`. Undo: drop the added columns and restore the mode check to ('paper','shadow') — only safe while no live orders exist.
- Env: nothing set by Claude. To connect: `COINBASE_API_KEY_NAME` + `COINBASE_API_PRIVATE_KEY` (View + Trade, NO Transfer; ideally a dedicated Coinbase portfolio).
- Behaviour: no key → status "not connected", nothing else happens. Key added → each tick reads permissions, balances, prices (3 Coinbase calls). Real orders only for desks Awad switches on (ROBOT → Real money · Coinbase → Go live… → type REAL MONEY).
- Rule for every bot: do not switch real money on, raise limits, or touch Coinbase order code without Awad's explicit instruction.

## 2026-10-02 ~08:00 UTC — Claude: RONIN (5th team) + every team learns on its own
- Awad asked: "add another team that does their own strategies, with more risk. I don't need to tell them what to do, they trade and try new strategies and learn as they go… (all crypto trading teams should learn as they go and make notes and implement)… make sure they are all trained and get updates and are experts in their role… cross trained". Then: "all teams should take notes, learn, implement, and have meetings to improve". Design (UI) comes later via a Codex prompt — only plain functional UI was added.
- RONIN: desk id `ronin`, strategy `custom-v1`. Agents JIN (Scout), KAEDE (Analyst/lead), RYU (Trader), TORA (Risk Officer) — roster in `desks.ts ROSTERS` (not in the floor art yet). Rule language: `strategy/custom-v1.ts` (indicators return/distFromHigh/distFromLow/emaGap/rsi/volumeRatio/volatility/greenStreak; entry all/any; exits TP/SL/trailing/max hold/exitWhen; sizing). `validateSpec` against `RONIN_LIMITS` (8 coins, ≤10%/trade, ≤4 positions, stop ≥ −25%). Seed strategy "Volume ignition" (3h return > 1.5% on 1.5× volume, RSI < 78; TP 6, SL −4, trail 2.5, 48h). Desk day-loss −5% (`crypto_floor_desks.risk`).
- Engine: per-desk universe + spec + day-loss limit (`engine.ts deskTrading/deskDayLossLimit`); tick fetches bars for every coin any desk/test trades (`floorUniverse`); live (Coinbase) planner and backtester support specs.
- Learning loop (ALL teams): `research.ts` meetings (cron `/api/crypto-floor/research` hourly at :20; rotation samurai, ronin, neon, ronin, orbit, ronin, phantom, ronin by UTC hour % 8; 11:20 UTC = all-hands of the five leads → floor briefing note). Tools in meetings: run_backtest, start_test, stop_test, adopt_change, write_note, list_trades. Minutes → `crypto_floor_meetings` + a `meeting` note + a `meeting` event. Owner can run one now: Lab tab → "Hold meeting now" (POST /api/crypto-floor/research {desk}).
- Evidence gate (`lab.ts`, unit-tested in `lab.test.ts`): forward test ≥5 closed trades, positive expectancy, beats the desk over the same period; OR backtests ≥6 trades in 30d, return ≥ current + 0.5 pt, positive expectancy, drawdown ≤ 8% (RONIN 15%) and ≤ max(1.5× current, 2%), and 90d not worse than current. 1 adoption per desk per 24h (`crypto_floor_param_changes.source='research'`). Desk with real money ON → only a `proposed` experiment for Awad to promote.
- Training: `training.ts` — expert playbook per role, cross-training, team playbooks, RONIN mandate, rule-language doc, learning protocol, `TRAINING_UPDATES` (append a dated line whenever training changes — that is how agents "get updates"), plus the daily floor briefing note (13:00 review) and the all-hands briefing.
- Chat: RONIN thread; agents also have write_note + adopt_change; context includes team journal, other teams' lessons, latest briefing, last meetings. Chat route maxDuration 300.
- Email: "What the teams learned (24h)" (meetings, adopted changes, lessons). Review writes a `briefing` note daily.
- DB (hub `myfclypikkcvfurkbzmj`): APPLIED `crypto_floor_learning` (= `20261002020000_crypto_floor_learning.sql`: desks.spec/risk, experiments.spec, param_changes source 'research', tables crypto_floor_notes + crypto_floor_meetings, max_open_positions_total 8→12). `20261002020100_crypto_floor_ronin.sql` (RONIN row) is applied AFTER the deploy (older code does not know custom-v1).
- Cost note: each meeting is up to 8 Claude calls (model = ANTHROPIC_MODEL). 24 meetings/day. If cost matters, lower the cron to every 2h in `vercel.json`.
- Not yet verified at time of writing: first RONIN tick, first meeting, first adoption.


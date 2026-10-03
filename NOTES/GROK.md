Grok Bot (Developer Bot hub + product leads) notes. Every change Grok Bot makes to this product (code, env, database, deploys) gets a dated entry here so Claude, Hermes and Codex stay on the same page.

## 2026-09-27 (CT) — Developer Bot (hub)
- Supabase: `crypto_floor_params` v1 was set to `halted=true` on the hub Supabase project by Developer Bot during approximately 15:55–16:30 CT because it was trading on AwadBot’s shared paper account.
- Ownership: Hermes owns the floor robot; no trading or code settings were changed by this note.
- Vercel name-only check: `WALLET_STATS_KEY` is missing on `awad-command`.
- Undo: resume the robot by setting `crypto_floor_params` v1 `halted=false`, under the floor robot owner’s control.

## 2026-09-28 02:46 AM CT — Developer Bot: crypto floor un-halted
- What: set `crypto_floor_params` (id=1) `halted=false` on the hub Supabase project. This undoes Developer Bot's own `halted=true` from 2026-09-27 3:30 PM CT.
- Why: Awad paused all product work to save credits, except the trading floor (AwadBot and the crypto floor), which he wants running.
- Who: Developer Bot (hub). Hermes still owns the floor.
- Undo: `update crypto_floor_params set halted=true where id=1;`

## 2026-09-28 04:08 AM CT — PR #43 merged: Require AI change notes (AI_CHANGELOG.md)
- What: Standing rule that any AI which changes this repo appends a dated entry to `AI_CHANGELOG.md` (what changed + why). Opened 2026-09-28 03:48 AM CT, merged 04:08 AM CT. Squash commit `45f89973c9f7ea2e809472eeea11195da501a544`. Branch commits `dcfa47b` (add the file) and `4e5f02d` (link it from `AGENTS.md`).
- Where: `AI_CHANGELOG.md` (new), `AGENTS.md` (link). PR https://github.com/313aidaroos/awad-command/pull/43. Head branch `junoai/ai-changelog`.
- Who: Juno. The head branch is `junoai/ai-changelog`, and the first `AI_CHANGELOG.md` entry is signed JunoAI (2026-09-28). GitHub author and merger login `313aidaroos` (commit used the owner email). No `juno/*` branch exists on the repo; the other Juno branch is `junoai/hq-subscriptions-boxes` (PR #53, below).
- Undo: `git revert 45f89973c9f7ea2e809472eeea11195da501a544`. Later commits also edit `AI_CHANGELOG.md` and `AGENTS.md`, so resolve those hunks by hand and keep the later entries.

## 2026-09-29 09:08 AM CT — direct to master `bbb6d44`: robot universe + crypto GTC
- What: Robot positions filtered to its crypto universe. Crypto orders use `time_in_force` `gtc`. Commit message: the 2026-09-27 live tick logged 3 rejections in `crypto_floor_events` (exits of AMD and an AAPL options contract that were not the robot's, and a BTC/USD buy rejected as `invalid crypto time_in_force` because `day` is stock-only).
- Where: `src/app/api/crypto-floor/tick/route.ts`. Commit `bbb6d447ba746fe4589f56af5c5a29d4a28bc479` on `master` (no PR).
- Who: Git author and committer, GitHub login `313aidaroos`. AI author unknown (not named in the commit, `AI_CHANGELOG.md`, `NOTES/CLAUDE.md`, or `docs/crypto-floor/ROBOT-SPEC.md`).
- Undo: `git revert bbb6d447ba746fe4589f56af5c5a29d4a28bc479`.

## 2026-09-29 09:10 AM CT — direct to master `765bc82`: ignore dust positions
- What: Ignore positions under $1 notional. Commit message: Alpaca rejects selling 5e-9 BTC, and the robot logged a fake take-profit every tick.
- Where: `src/app/api/crypto-floor/tick/route.ts`. Commit `765bc828f7d5d410e616023d49ddddf1e76940d9` on `master` (no PR).
- Who: Git author and committer, GitHub login `313aidaroos`. AI author unknown (same sources as `bbb6d44`).
- Undo: `git revert 765bc828f7d5d410e616023d49ddddf1e76940d9`.

## 2026-09-29 09:11 AM CT — direct to master `1dd3efd`: Vercel cron every 5 min
- What: Vercel cron hits `/api/crypto-floor/tick` every 5 minutes. GET handler with a `CRON_SECRET` guard. Commit message: gate met (live tick writes events; 0 false signals after the dust filter).
- Where: `vercel.json` cron `{ "path": "/api/crypto-floor/tick", "schedule": "*/5 * * * *" }`, and `src/app/api/crypto-floor/tick/route.ts`. Commit `1dd3efd35093c8167e69c2d6c554b79829fbd7c3` on `master` (no PR).
- Who: Git author and committer, GitHub login `313aidaroos`. AI author unknown (same sources as `bbb6d44`).
- Undo: `git revert 1dd3efd35093c8167e69c2d6c554b79829fbd7c3`. If `vercel.json` conflicts with later cron entries, delete only the `/api/crypto-floor/tick` / `*/5 * * * *` entry.

## 2026-09-30 02:34 AM CT — PR #44 merged: remove unused `apixis-wallet.ts`
- What: Deleted `src/lib/apixis-wallet.ts` (SDK v2 copy; nothing imported it). `AI_CHANGELOG.md` says COMMAND is not a Wallet client by design. Opened 2026-09-30 02:27 AM CT, merged 02:34 AM CT. Squash `9a3a370e45e59703d262834366626e315b9c3603`.
- Where: `src/lib/apixis-wallet.ts` (deleted), `AI_CHANGELOG.md`. PR https://github.com/313aidaroos/awad-command/pull/44. Head branch `claude/awesome-newton-3tygzi`.
- Who: Claude (`AI_CHANGELOG.md` 2026-09-30; PR body says Claude Code). GitHub author and merger login `313aidaroos`.
- Undo: `git revert 9a3a370e45e59703d262834366626e315b9c3603` (restores `src/lib/apixis-wallet.ts`).

## 2026-10-01 11:20 PM CT — PR #15 closed (not merged)
- What: Closed without merge. Title: "[PARKED / INCOMPLETE] Graphite cathedral — do not ship". Opened 2026-09-08. Closed 2026-10-02 04:20:19 UTC. Head `cursor/graphite-cathedral-19fe`. No merge commit.
- Where: PR https://github.com/313aidaroos/awad-command/pull/15. Branch files were scene/universe/kit changes; they are not on `master`.
- Who: Closed by GitHub login `313aidaroos` (issue event `closed`). AI author unknown.
- Undo: Reopen the PR (`gh pr reopen 15`). `master` has nothing from this PR to revert.

## 2026-10-01 11:20 PM CT — PR #14 closed (not merged)
- What: Closed without merge, 3 seconds after #15 (2026-10-02 04:20:22 UTC). Title: "Visual leap: graphite cathedral (INCOMPLETE — sphere+cube fail)". Opened 2026-09-08. Head `cursor/visual-leap-cinematic-a9c9`. No merge commit. PR body says incomplete and parked.
- Where: PR https://github.com/313aidaroos/awad-command/pull/14. Branch files were scene/universe changes; they are not on `master`.
- Who: Closed by GitHub login `313aidaroos` (issue event `closed`). AI author unknown.
- Undo: Reopen the PR (`gh pr reopen 14`). `master` has nothing from this PR to revert.

## 2026-10-02 12:40 AM CT — hub DB: migration `20261002000000` applied
- What: `NOTES/CLAUDE.md` records migration `crypto_floor_robot_v2` applied live on the hub Supabase project at ~05:40 UTC (12:40 AM CT), before the code merge. Additive. `crypto_floor_params` gained halt_reason, halted_at, halted_by, day_paused_until, day_pause_reason, max_open_positions_total (8), max_orders_per_tick (3), tick_lease_until, tick_lease_holder. `crypto_floor_events` UNIQUE(order_id) dropped for a unique index on (type, order_id); `strategy` column recorded in a migration. New tables (RLS on, service role only): `crypto_floor_desks` (seeded samurai=momentum-v1, neon=dip-v1, orbit=swing-v1, phantom=breakout-v1; $25k paper each), `crypto_floor_orders`, `crypto_floor_daily`, `crypto_floor_reports`, `crypto_floor_messages`, `crypto_floor_experiments`, `crypto_floor_param_changes`. `20260928010000_crypto_floor_events.sql` made a no-op in the same code change. `halted` left false. No env vars changed by Claude.
- Where: the hub Supabase project. File `supabase/migrations/20261002000000_crypto_floor_robot_v2.sql` (file reached `master` later in squash `f04de95`, PR #45).
- Who: Claude (`NOTES/CLAUDE.md`, `AI_CHANGELOG.md`).
- Undo: Down-migration note from `NOTES/CLAUDE.md`: the new tables can be dropped; old v1 code keeps working against the new schema. Drop `crypto_floor_desks`, `crypto_floor_orders`, `crypto_floor_daily`, `crypto_floor_reports`, `crypto_floor_messages`, `crypto_floor_experiments`, `crypto_floor_param_changes`, and the columns this migration added on `crypto_floor_params`. Restore UNIQUE(order_id) on `crypto_floor_events` only while no two rows share an order_id.

## 2026-10-02 01:03 AM CT — PR #45 merged: Crypto Floor robot v2 live
- What: Four desks trading paper 24/7, daily email, desk-lead chat, strategy lab. Opened 01:03:31 AM CT, merged 01:03:44 AM CT. Squash `f04de95b6d026d97b228e75b2f917b1e441345e8`. `NOTES/CLAUDE.md`: merged by Awad's instruction ("merge to master"). Vercel production deploy recorded in `NOTES/CLAUDE.md` was READY. First v2 tick 06:05:40 UTC (01:05 AM CT): heartbeat, no errors, 1.9 s; four desks enabled, $25k each; 0 orders (no setup). Engine under `src/lib/crypto-floor/` (`engine.ts`, `tick.ts`, strategies including `swing-v1` and `breakout-v1`, ledger, review, report, lab, agent chat). Routes `/api/crypto-floor/{tick,review,snapshot,control,lab,chat,place-order,events}`. UI robot bar, kill switch, ROBOT / CHAT / LAB tabs. Cron added: `/api/crypto-floor/review` at `0 13 * * *` (13:00 UTC = 8:00 AM CT). Env: Claude changed nothing. Still used: `ALPACA_API_KEY` / `ALPACA_SECRET`, `TRADE_MODE=paper`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` (+ `ANTHROPIC_MODEL`), `RESEND_API_KEY`. Optional, not set by Claude: `CRYPTO_FLOOR_ALPACA_API_KEY` / `CRYPTO_FLOOR_ALPACA_SECRET_KEY`, `CRYPTO_FLOOR_REPORT_EMAIL` (default owner email), `CRYPTO_FLOOR_EMAIL_FROM`.
- Where: `src/lib/crypto-floor/`, `src/app/api/crypto-floor/`, `src/crypto-floor/`, `vercel.json`, `supabase/migrations/20261002000000_crypto_floor_robot_v2.sql`, `AGENTS.md`, `AI_CHANGELOG.md`, `NOTES/CLAUDE.md`, `docs/crypto-floor/ROBOT-SPEC.md`, `src/ceo/tools.ts`. PR https://github.com/313aidaroos/awad-command/pull/45. Head `claude/gracious-brahmagupta-2w2bcc`.
- Who: Claude (`AI_CHANGELOG.md`, `NOTES/CLAUDE.md`, branch name). GitHub author and merger login `313aidaroos`.
- Undo: `git revert f04de95b6d026d97b228e75b2f917b1e441345e8`. Remove the `/api/crypto-floor/review` cron entry from `vercel.json`. DB undo is the down-migration in the 12:40 AM CT entry. Redeploy the reverted `master` so production leaves that deploy.

## 2026-10-02 01:39 AM CT — PR #46 merged: Coinbase real-money venue, OFF
- What: Coinbase Advanced Trade wired as the real-money venue and left OFF. Opened 01:37 AM CT, merged 01:39 AM CT. Squash `9a137aeb25f0bf66a68ad1b44603ac0af6855779`. New `coinbase.ts`, `live.ts`, `liveRun.ts`. Owner actions `live_on` (typed REAL MONEY) / `live_off` / `live_limits`. UI "Real money · Coinbase". `NOTES/CLAUDE.md` ~07:00 UTC (02:00 AM CT): migration `20261002010000_crypto_floor_coinbase.sql` APPLIED on the hub Supabase project. Adds `crypto_floor_desks.live_enabled` (all false), `crypto_floor_params.live_max_total_usd=100` / `live_max_trade_usd=25` / `live_day_loss_usd=10` / `live_paused_until`, and `crypto_floor_orders.mode` allows `live` plus `venue` / `venue_order_id` / `fees`. Env: nothing set by Claude. To connect later: `COINBASE_API_KEY_NAME` + `COINBASE_API_PRIVATE_KEY` (View + Trade, no Transfer). No key means status "not connected".
- Where: `src/lib/crypto-floor/coinbase.ts`, `live.ts`, `liveRun.ts`, `src/app/api/crypto-floor/control/route.ts`, `src/crypto-floor/RobotConsole.tsx`, `supabase/migrations/20261002010000_crypto_floor_coinbase.sql`, `docs/KEYS_TOMORROW.md`, `docs/crypto-floor/ROBOT-SPEC.md`, `AGENTS.md`, `AI_CHANGELOG.md`, `NOTES/CLAUDE.md`. PR https://github.com/313aidaroos/awad-command/pull/46. Head `claude/gracious-brahmagupta-2w2bcc`. The hub Supabase project.
- Who: Claude (`AI_CHANGELOG.md`, `NOTES/CLAUDE.md`). GitHub author and merger login `313aidaroos`.
- Undo: `git revert 9a137aeb25f0bf66a68ad1b44603ac0af6855779`. Down-migration from `NOTES/CLAUDE.md`: drop the added columns and restore the `crypto_floor_orders` mode check to `('paper','shadow')` — only safe while no live orders exist. Leave Coinbase env unset.

## 2026-10-02 02:22 AM CT — PR #47 merged: RONIN + team learning; research cron
- What: Fifth desk RONIN (`custom-v1`, higher risk, own strategies) and a learning loop for every team (meetings, journals, evidence-gated adopt on paper only). Opened 02:20 AM CT, merged 02:22 AM CT. Squash `b454cc8b2f100aef413fc4b266c23ecb1593f35f`. Cron added: `/api/crypto-floor/research` at `20 * * * *` (hourly at :20 UTC). Migrations in the commit: `20261002020000_crypto_floor_learning.sql` and `20261002020100_crypto_floor_ronin.sql`. `NOTES/CLAUDE.md`: learning migration APPLIED on the hub Supabase project (desks.spec/risk, experiments.spec, param_changes source `research`, tables `crypto_floor_notes` + `crypto_floor_meetings`, max_open_positions_total 8→12). RONIN row applied after deploy, at 07:25 UTC (02:25 AM CT), on the deploy recorded in `NOTES/CLAUDE.md`. Limits stay `RONIN_LIMITS` in code (8 coins, ≤10%/trade, ≤4 positions, stop mandatory, desk day-loss −5%).
- Where: `src/lib/crypto-floor/strategy/custom-v1.ts`, `training.ts`, `notes.ts`, `research.ts`, `lab.ts`, `src/app/api/crypto-floor/research/route.ts`, `vercel.json`, `supabase/migrations/20261002020000_crypto_floor_learning.sql`, `supabase/migrations/20261002020100_crypto_floor_ronin.sql`, `AGENTS.md`, `AI_CHANGELOG.md`, `NOTES/CLAUDE.md`, `docs/crypto-floor/ROBOT-SPEC.md`. PR https://github.com/313aidaroos/awad-command/pull/47. Head `claude/gracious-brahmagupta-2w2bcc`.
- Who: Claude (`AI_CHANGELOG.md`, `NOTES/CLAUDE.md`). GitHub author and merger login `313aidaroos`.
- Undo: `git revert b454cc8b2f100aef413fc4b266c23ecb1593f35f`. Remove the `/api/crypto-floor/research` cron entry from `vercel.json`. Down-migration: delete the `ronin` row in `crypto_floor_desks` and its `source='migration'` row in `crypto_floor_param_changes`; drop `crypto_floor_notes` and `crypto_floor_meetings`; drop `spec`/`risk` (and experiments.spec); restore the param_changes source check without `research`; set `max_open_positions_total` back to 8. `NOTES/CLAUDE.md` says the RONIN row was applied after deploy because older code does not know `custom-v1`.

## 2026-10-02 02:28 AM CT — PR #48 merged: adding a desk is not P&L
- What: Floor start-of-day equity is the sum of each desk's own baseline. `NOTES/CLAUDE.md`: the first tick after RONIN showed "floor today +$25,000" because new capital counted as P&L. Opened 02:27 AM CT, merged 02:28 AM CT. Squash `dc44135cfac0b8c38ed5b7cb6fcdde672a6bdda3`.
- Where: `src/lib/crypto-floor/engine.ts`, `state.ts`, `review.ts`, plus tests, `AI_CHANGELOG.md`, `NOTES/CLAUDE.md`. PR https://github.com/313aidaroos/awad-command/pull/48. Head `claude/gracious-brahmagupta-2w2bcc`.
- Who: Claude (`AI_CHANGELOG.md`, `NOTES/CLAUDE.md`). GitHub author and merger login `313aidaroos`.
- Undo: `git revert dc44135cfac0b8c38ed5b7cb6fcdde672a6bdda3`.

## 2026-10-02 02:35 AM CT — PR #49 merged: Awad's coins first on every desk
- What: `OWNER_COINS` (XRP, DOGE, SOL, PEPE, XLM, HBAR, BILL) first on every desk list, plus BTC/ETH; RONIN also AVAX/LINK/LTC. Alpaca asset list: skip pairs Alpaca does not carry, round qty to the increment. `AI_CHANGELOG.md`: RONIN's stored spec universe updated in the hub DB (owner-directed). Paper only; Robinhood is not connected. Opened 02:33 AM CT, merged 02:35 AM CT. Squash `b4196db00b6f58f5f45c7ad3dc5ffaffc2c6f67b`.
- Where: `src/lib/crypto-floor/types.ts`, `alpaca.ts`, `tick.ts`, `training.ts`, `strategy/custom-v1.ts`, hub table `crypto_floor_desks` row `ronin` (`spec`). PR https://github.com/313aidaroos/awad-command/pull/49. Head `claude/gracious-brahmagupta-2w2bcc`.
- Who: Claude (`AI_CHANGELOG.md`, `NOTES/CLAUDE.md`). GitHub author and merger login `313aidaroos`.
- Undo: `git revert b4196db00b6f58f5f45c7ad3dc5ffaffc2c6f67b`. Restore `crypto_floor_desks.spec` for `id='ronin'` to the seed universe in `supabase/migrations/20261002020100_crypto_floor_ronin.sql` (BTC ETH SOL XRP DOGE AVAX LINK LTC).

## 2026-10-02 02:48 AM CT — PR #50 merged: Trades & P/L box + "Email me this"
- What: `TradesBox` on `/crypto-floor` (floor value, today / all-time / open P/L, per-team P/L, open positions, latest orders, closed trades; 10s poll). Owner route `/api/crypto-floor/email` and `dailyReport.ts` `sendFloorUpdate` email the current trades and P/L. Opened 02:46 AM CT, merged 02:48 AM CT. Squash `25dbbfbd60843c2c0c6e1eb78006fadbb059d14e`.
- Where: `src/crypto-floor/RobotConsole.tsx`, `CryptoFloor.tsx`, `src/app/api/crypto-floor/email/route.ts`, `src/lib/crypto-floor/dailyReport.ts`, `AI_CHANGELOG.md`. PR https://github.com/313aidaroos/awad-command/pull/50. Head `claude/gracious-brahmagupta-2w2bcc`.
- Who: Claude (`AI_CHANGELOG.md`). GitHub author and merger login `313aidaroos`.
- Undo: `git revert 25dbbfbd60843c2c0c6e1eb78006fadbb059d14e`.

## 2026-10-02 03:03 AM CT — PR #51 merged: Trades & P/L box moved down
- What: The Trades & P/L box sits below the floor illustrations (above the footer) instead of under the status bar. Opened 03:01 AM CT, merged 03:03 AM CT. Squash `78664567ff0c5d8d09c4fe1ce049792528932865`.
- Where: `src/crypto-floor/CryptoFloor.tsx`, `AI_CHANGELOG.md`. PR https://github.com/313aidaroos/awad-command/pull/51. Head `claude/gracious-brahmagupta-2w2bcc`.
- Who: Claude (`AI_CHANGELOG.md`). GitHub author and merger login `313aidaroos`.
- Undo: `git revert 78664567ff0c5d8d09c4fe1ce049792528932865`.

## 2026-10-02 03:19 AM CT — PR #52 opened (still open): LIVE box, team reports, email alerts
- What: Not merged, so none of this is on `master`. LIVE box on every tab, team reports, email alerts. Proposed cron `/api/crypto-floor/daily-start` at `5 0 * * *` (00:05 UTC). Proposed env switch `CRYPTO_FLOOR_EMAIL_ALERTS=off` to stop fill/report alert emails (the 13:00 UTC daily report stays separate). That env var is not recorded as set.
- Where: Branch `claude/gracious-brahmagupta-2w2bcc`. Files in the PR: `src/crypto-floor/RobotConsole.tsx`, `CryptoFloor.tsx`, `floor.css`, `src/lib/crypto-floor/alerts.ts`, `schedule.ts`, `teamReports.ts`, `liveRun.ts`, `research.ts`, `tick.ts`, `src/app/api/crypto-floor/daily-start/route.ts`, `src/lib/supabase/middleware.ts`, `vercel.json`, `AI_CHANGELOG.md`, `NOTES/CLAUDE.md`. PR https://github.com/313aidaroos/awad-command/pull/52.
- Who: Claude (PR branch `AI_CHANGELOG.md` entry "Claude (LIVE box on every tab, team reports, email alerts)"; `NOTES/CLAUDE.md` hunk on the branch). GitHub author login `313aidaroos`.
- Undo: Close PR #52 without merging. Do not add the `/api/crypto-floor/daily-start` cron on `master`.

## 2026-10-02 03:03 PM CT — PR #53 opened (still open): Juno HQ subscriptions boxes
- What: Not merged, so none of this is on `master`. Headquarters subscriptions box (static snapshot from an Oct 2 inbox audit) and per-box shape (Square | Rectangle) and size (S | M | L), stored in `localStorage` key `hq-box-layout`. Opened 2026-10-02 20:03:46 UTC.
- Where: Branch `junoai/hq-subscriptions-boxes`. Files in the PR: `src/headquarters/SubscriptionsBox.tsx`, `subscriptions-data.ts`, `RoomBox.tsx`, `Headquarters.tsx`, `NewsDesk.tsx`, `headquarters.css`, `AI_CHANGELOG.md`, `JUNOAI_NOTES.md`. PR https://github.com/313aidaroos/awad-command/pull/53.
- Who: JunoAI (branch `junoai/hq-subscriptions-boxes`; the branch's `AI_CHANGELOG.md` entry and new `JUNOAI_NOTES.md` are signed JunoAI). GitHub author login `313aidaroos`.
- Undo: Close PR #53 without merging.

## 2026-10-02 05:32 PM CT — Dashboard Lead: backfill this file
- What: Appended the entries above so `NOTES/GROK.md` records changes since 2026-09-28 (PRs, direct-to-master commits, hub migrations, crons, Coinbase settings left OFF). Sources: `git log`, GitHub PR history, `AI_CHANGELOG.md`, `NOTES/CLAUDE.md`, `docs/crypto-floor/ROBOT-SPEC.md`. No other file in this change.
- Where: `NOTES/GROK.md` only.
- Who: Dashboard Lead via cloud agent, for Awad.
- Undo: revert PR #54 (`NOTES/GROK.md` only).

## 2026-10-02 10:10 PM CT — PR opened (not merged): riskier 5-desk paper crypto floor
- What: Riskier floor per `crypto-floor-riskier-2026-10-02` spec: 5 desks with side-by-side strategy lanes (trend-v1, meanrev-v1, options-v1, scalp-v1), US stocks (regular + extended) and long options (ORBIT, regular hours), per-desk hard daily loss caps (default −4%, owner-only), options max loss per position (default $250), floor-owned reconcile (cf-/rc- only, ledger-only adjustments), floor uses only `CRYPTO_FLOOR_ALPACA_API_KEY` / `CRYPTO_FLOOR_ALPACA_SECRET_KEY` (no fallback; missing → not trading + red banner). UI shows all 5 desks, asset classes, loss-cap status, options max loss and per-strategy results. Paper only; no env set, no migration, no deploy.
- Where: `src/lib/crypto-floor/**`, `src/app/api/crypto-floor/{tick,health,place-order,lab}`, `src/crypto-floor/{RobotConsole,CryptoFloor}.tsx`, `src/crypto-floor/model.ts` (two desk labels), `docs/crypto-floor/{RISKIER-FLOOR,ROBOT-SPEC}.md`, `.env.example`, `AI_CHANGELOG.md`. Branch `grok/crypto-floor-riskier-2026-10-02`.
- Who: Grok/Developer Bot, for Awad (finished an interrupted build on the same branch).
- Verified: typecheck, lint (0 errors), all vitest suites, `next build`; local dev run against a mock DB with no floor keys (snapshot 200, "no own account" banner). Screenshots in `docs/crypto-floor/shots/2026-10-02/`.
- Needs Awad: a NEW Alpaca paper account for the floor; then Developer Bot sets `CRYPTO_FLOOR_ALPACA_API_KEY` / `CRYPTO_FLOOR_ALPACA_SECRET_KEY` (not set by this PR).
- Undo: revert the PR.

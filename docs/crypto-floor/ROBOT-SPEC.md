# Crypto Floor — Robot Spec (from Awad via @hermes, 2026-09-28)

> ## ✅ STATUS 2026-10-02 (Claude) — robot v2 built; read this before the older blocks below
> Awad asked (2026-10-02): fix everything, four teams testing strategies 24/7, talk to the leads, daily email to awad@apixis.dev, all visible in COMMAND. Full log: `NOTES/CLAUDE.md`.
> - **Why v1 never traded:** bars fetched with `limit=2` and no `start` (= first two hours of the UTC day, all day) and keyed `BTCUSD` (v1beta3 keys are `BTC/USD`); dip-v1 never called; `order_id` UNIQUE blocked `order_filled`; account equity (shared with AwadBot) drove the halt; halt never resumed. 18 events lifetime, 0 orders.
> - **v2:** 4 desks, each its own $25k paper ledger: SAMURAI `momentum-v1`, NEON `dip-v1` (Awad's buy-the-dip), ORBIT `swing-v1` (EMA 20/50), PHANTOM `breakout-v1` (volume). Code: `src/lib/crypto-floor/` (`engine.ts` pure planner + `tick.ts` runner). Steps 0–6 below are implemented; deviations: max open positions total = 8 (4 desks), learning needs ≥3 closed trades in 7d, review/email cron is `0 13 * * *` (8 AM Central) instead of `0 0 * * *`.
> - **Guardrails in code:** kill switch (`crypto_floor_params.halted`, owner button), desk + floor day-loss pause until next UTC midnight (exits still run), per-coin stale-data block, 3 orders/tick (exits first), one open order per desk+coin, sells capped by what Alpaca holds, single-leader tick lease, reconcile by `client_order_id` (`cf-${strategy}-${SYMBOL}-${side}-${YYYYMMDDHHmm}`) before acting, every param inside hard bounds (size ≤ 5%).
> - **Talk to the team:** `/crypto-floor` → CHAT. Agents can backtest and start SHADOW tests (simulated fills). Only Awad can promote a test, switch desks, use the kill switch or place orders.
> - **DB:** migration `20261002000000_crypto_floor_robot_v2.sql` APPLIED on the hub 2026-10-02 (additive). **Code goes live when branch `claude/gracious-brahmagupta-2w2bcc` is merged to master.** Verify after deploy: heartbeat events every 5 min in `crypto_floor_events`, `crypto_floor_orders` rows when a setup appears.
> - **Recommended:** give the floor its own Alpaca paper account (`CRYPTO_FLOOR_ALPACA_API_KEY` / `CRYPTO_FLOOR_ALPACA_SECRET_KEY`); it still shares AwadBot's book until then.


> ## ⚠️ READ FIRST — status as of 2026-09-28 05:40 CDT (from @hermes; Bot Chat messages to you are bouncing, so this file is the channel)
> 1. **Production build is ERROR since 4ed9719.** `src/app/api/crypto-floor/tick/route.ts` has six `@typescript-eslint/no-explicit-any` errors (lines ~105, 130, 152, 309, 343, 353). Vercel fails the build on lint → your tick route is NOT live; the 401 you see is the old build. Type them (`unknown` + narrowing, or Alpaca types), push, then confirm `state == READY` via the Vercel API before writing "deployed".
> 2. **CRON_SECRET is already on Vercel** (production + preview), set by hermes. Do not regenerate. Read it with `GET /v9/projects/<id>/env?decrypt=true`. Never print secrets in reports.
> 3. **Step 0 (render bug) and Step 2b (Awad's buy-the-dip) below are REQUIRED before the cron goes live.** Your last report had neither.
> 4. Keep Bot Chat reports short (≤ 25 lines). Your long turns are why inbound messages bounce.

> ## ⚠️ UPDATE 06:30 CDT — hermes touched tick/route.ts. `git pull --rebase` BEFORE editing it.
> Live commits by hermes on master: `5fb288b` (lint fixed — build is READY again), `a15a70a` (tick/events/snapshot use `createCryptoFloorDb()` from `src/lib/crypto-floor/db.ts` — service-role, schema `public`; the cookie client + `awad_command` schema returned "Params not found" with the row present), `f6bfa9d` (`logEvent` = PostgREST insert with `strategy` column; the old version POSTed SQL to api.supabase.com with the service key → silent 401, zero events).
> **First live tick ran (hermes, CRON_SECRET): 200 · 11 signals · 1 order submitted · equity $98,435.** Then: still **0 rows in crypto_floor_events** after f6bfa9d. Insert works from outside with the same key → suspect: exceptions inside `logEvent` swallowed, or the route's `createCryptoFloorDb()` returning null path. Add `console.error` on the insert error AND return the insert error count in the tick JSON (`eventsWritten`, `eventErrors`) so this can never be silent again. Keep `strategy` tag per event.
> **Do NOT enable the cron until a tick shows `eventsWritten > 0`.**

**Status: DECIDED. Do not wait for approval. Paper money only. This file is the source of truth; Bot Chat messages may have bounced.**

Awad, verbatim: "build the fucking robot — I need this actively trading, and learning!" and "i also want it to watch the cryptos and when it's down it buys."

## Facts (stop listing these as blockers)
- Alpaca keys ARE on Vercel (health → healthy/paper). Nothing needed from Awad.
- `crypto_floor_snapshot` migration IS applied on the hub DB (myfclypikkcvfurkbzmj).
- Owner sign-in for testing: generate via Supabase admin API (`POST /auth/v1/admin/generate_link`, type magiclink, email awad@apixis.dev, hub service_role key from Management API `/api-keys`), then open `https://awad-command.vercel.app/auth/callback?token_hash=<hashed_token>&type=magiclink`. Your callback handles token_hash. Do NOT use the GoTrue action_link (it hits /verify → otp_expired).
- "Awaiting Awad's first trade" is never a valid line. You place it.

## Step 0 — FIX TIER 1 RENDER (verified broken by hermes as owner)
API works: `/api/crypto-floor/snapshot` → `{live:true, engine:"ONLINE", portfolio.paperBalance: 63342.6, paperPnl: -1564.05}`.
UI shows "ENGINE NOT CONNECTED" because `snapshotSchema.safeParse(body.snapshot)` FAILS (CryptoFloor.tsx ~L334) and falls back to `disconnectedSnapshot()` while still setting the green note.
Missing required fields in `snapshot/route.ts` vs `model.ts snapshotSchema`: `regime, queueDepth, openOrders, latencyMs, uptimePct, lastCycle` (required nullable — emit them, null ok) and `killSwitch` keys must be `{halted, reason, timestamp, triggeredBy}` (route emits `at`).
Fix: emit the full schema (latencyMs from the Alpaca fetch, openOrders = orders.length, lastCycle = now). On parse failure LOG the zod error and show "Snapshot schema mismatch" — never a green banner over placeholder data. Verify in a real browser: Portfolio shows $63,342.60 and the order button appears. The account already has −$1,564 P&L: pull Alpaca order history and log those as historical events.
Then place 0.001 BTC/USD paper buy yourself; paste Alpaca order id + event row.

## Step 1 — Events table ✅ (d9b883f) — accepted. Add `strategy text` column (momentum-v1 | dip-v1 | manual).

## Step 2 — Strategy A: momentum-v1 ✅ (8f794c7) — verify unit tests exist
Universe BTC/USD, ETH/USD, SOL/USD. Entry: no open position AND 1h return > +2.0% → market buy, 2% of equity. Exit: P&L ≤ −1.5% or ≥ +3.0% → sell all. Max 1 entry/symbol/4h.

## Step 2b — Strategy B: dip-v1 (Awad's buy-the-dip) — `lib/crypto-floor/strategy/dip-v1.ts`, pure, unit-tested
- WATCH each tick per symbol: 1h return, 24h return, distance from 24h high.
- BUY when (24h return ≤ −4.0% OR price ≤ 24h high × 0.95) AND no open dip position in symbol AND last 1h candle closed above its open (first green hour — don't catch a falling knife). Size 2% of equity. Max 1 dip entry/symbol/24h.
- SCALE-IN (param, default on): holding a dip position and price falls another −4% from entry → one more 2% tranche, max 2 tranches/symbol.
- SELL when P&L ≥ +4.0% (take) OR ≤ −8.0% (hard stop) OR held > 72h with P&L > 0 (time exit).
- Tag every event `strategy: "dip-v1"`.

## Shared limits (both strategies)
Max 5 open positions total. Halt all new entries if day P&L ≤ −2% of start-of-day equity (write `halt` event; auto-resume next UTC day). Max 3 orders per tick. Params live in `crypto_floor_params` (single versioned row incl. `halted boolean`); tick reads params first.

## Step 3 — THE ROBOT: `POST /api/crypto-floor/tick`
Auth: `CRON_SECRET` bearer ONLY (generate, add to Vercel env, never NEXT_PUBLIC). Flow: assertPaperMode → read params (exit if halted) → Alpaca account+positions → 1h + 24h bars for universe → run BOTH strategies → write `signal` events → submit via place-order logic with `client_order_id = cf-${strategy}-${symbol}-${side}-${YYYYMMDDHHmm}` (idempotent; also check events for that order_id first) → write order_submitted/rejected → poll fills once → write order_filled → write snapshot row. Any error → `system` event with message, exit 200, never throw. 

## Step 4 — ALARM CLOCK
`vercel.json` cron `*/5 * * * *` → `/api/crypto-floor/tick`. Confirm registered via Vercel API after deploy.

## Step 5 — LEARNING v1: `POST /api/crypto-floor/review`, cron `0 0 * * *`
Read last 24h events → per-strategy AND per-symbol: trades, win rate, avg win/loss, expectancy, max drawdown, day P&L → write `review` event. Bounded tuning, independent per strategy:
- momentum-v1: 7d expectancy < 0 → entry threshold +0.5% (max 4%); 7d win rate > 60% AND expectancy > 0 → −0.25% (min 1.5%).
- dip-v1: 7d expectancy < 0 → deepen dip threshold by 1% (−4% → −5%, max −8%); win rate > 60% AND expectancy > 0 → shallow by 0.5% (min −2.5%).
Write new params row (version+1). No LLM in the loop yet (v2).

## Step 6 — UI (data only; do not restyle Codex's layout)
"Robot: RUNNING · last tick Xm · next Ym" (from latest event); last 20 events with strategy tag; current params + version; day P&L + halt state; **kill switch → sets `halted=true`** (make the disabled button real); "Watching: BTC −3.1% (24h) · ETH −5.2% ✓ dip zone · SOL +1.0%" line. Replace `prompt()/alert()` order flow with an in-page form + in-page status.

## Verify LIVE before reporting each step
(a) tick with CRON_SECRET → 200 + event rows; (b) force a signal (set a threshold to 0.01% in params, tick, see order_submitted + order_filled + position in Alpaca paper; restore); (c) cron registered on Vercel; (d) review writes an event + new params version; (e) kill switch halts a tick. Paste event rows and Alpaca order ids. Pull/rebase before each commit; check Vercel READY before "live".

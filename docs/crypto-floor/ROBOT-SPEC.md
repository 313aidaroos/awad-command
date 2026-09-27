# Crypto Floor — Robot Spec (from Awad via @hermes, 2026-09-28)

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

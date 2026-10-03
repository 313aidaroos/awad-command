# Crypto Floor — riskier 6-desk paper floor (2026-10-02, CYCLE added 2026-10-03)

Paper only. `TRADE_MODE=paper`, Coinbase `live_enabled=false` on every desk; this change adds no live path.

## Own Alpaca account (no fallback)
- The floor reads only `CRYPTO_FLOOR_ALPACA_API_KEY` / `CRYPTO_FLOOR_ALPACA_SECRET_KEY` (`src/lib/crypto-floor/alpaca.ts` `floorAlpacaConfig`).
  `ALPACA_*` / `APCA_*` (AwadBot's paper account) are never read by the floor robot.
- Missing keys: `/api/crypto-floor/tick` still returns 200, makes no broker call, logs a `system` event
  "Floor not trading — no own account" at most once an hour, and writes a heartbeat with `noOwnAccount: true`.
  The snapshot exposes `robot.noOwnAccount` / `robot.noOwnAccountMessage`; the UI shows a red banner in the robot bar.
  `/api/crypto-floor/health` reports `noOwnAccount` and the missing key names. Place-order and lab refuse with the same message.

## Desks
| Desk | Primary | Side-by-side lane | Assets |
|---|---|---|---|
| SAMURAI | momentum-v1 | trend-v1 (SMA20/50 trend + pullback) | crypto, stocks |
| NEON | dip-v1 | meanrev-v1 (z-score / RSI mean reversion) | crypto, stocks |
| ORBIT | swing-v1 (EMA9/21) | options-v1 (long calls/puts on SPY/QQQ/NVDA/TSLA/AAPL) | crypto, options |
| PHANTOM | breakout-v1 | scalp-v1 (15-minute bars) | crypto, stocks |
| RONIN | custom-v1 (agent-written spec) | — | crypto |
| CYCLE | cycle-straddle-v1 (weekly long ATM straddles) | — | options only (paper only) |

Stock universe: SPY, QQQ, NVDA, TSLA, AAPL, AMD, META, MSFT, AMZN, COIN, MSTR, PLTR.
Crypto trades 24/7. Stocks: regular hours (market/day) and extended hours (limit/day/extended_hours, whole shares, ±0.5% limit).
Options: regular hours only, limit/day, whole contracts, long premium only (no writing, no spreads).

## CYCLE — cycle-straddle-v1 (2026-10-03, Awad's idea)
Prices move in a ~3-week cycle. Code: `strategy/cycle-straddle-v1.ts` (pure), order path in `engine.ts`, chains in `tick.ts`.
- **Universe**: SPY and QQQ every week, plus stocks from `CYCLE_SCREEN` whose 1-year daily bars show a real ~15-trading-day
  cycle (`detectCycle`: detrend with a 31-day centered average, then autocorrelation at a 12–18 day lag ≥ 0.15 AND that band's
  share of the 4–60 day spectrum ≥ 20%). On random walks about 0.2% of stocks qualify.
- **Entry**: Mondays (New York), regular session only. One long ATM straddle per underlying: call + put, same strike (closest to
  the price), expiry 21–35 days (closest to 28). Both legs or nothing; limit/day at the ask.
- **Size**: max **$500 debit** per straddle (`STRADDLE_MAX_DEBIT_USD`, code constant, owner-only); contracts =
  floor(500 / ((call ask + put ask) × 100)); 0 → no trade. Max **4 open** straddles per desk. Nothing re-enters an underlying
  held or entered in the last 4 days.
- **Exits**: each leg sells on its own at **+50%**. What is left sells when the open legs together are **−50%**, or on
  **trading day 15** (weekdays; holidays count, so it can be a day early). Long premium only, never sells to open.
- The desk's daily loss cap and the floor-owned `cf-` reconcile apply as for every desk. The lab cannot backtest CYCLE; it cannot go live.
- Note: an ATM 4-week SPY/QQQ straddle costs about $2,000, so with the $500 cap only cheaper names (F, BAC, T, PFE, INTC, SOFI, AAL)
  can be bought, and only when their cycle qualifies.
- Migration `20261003000000_crypto_floor_cycle.sql` adds the desk row (apply after the code is deployed).

## Risk
- **Per-desk hard daily loss cap** (`risk.ts`): default −4% of the desk's start-of-day equity, clamped to [−10%, −0.5%].
  Read only from `crypto_floor_desks.risk.dayLossPct` (owner-set). `params` (agents, lab, the daily review) cannot change it.
  At the cap the desk opens nothing new until the next UTC day; exits keep running. Other desks keep trading.
  The old floor-wide day pause is retired.
- **Options max loss**: `risk.optionMaxLossUsd` (default $250, clamped to [$25, $1000]). Contracts = floor(maxLoss / (premium × 100));
  0 contracts → no trade. Long premium means the max loss is the premium paid.
- **No naked shorts**: every sell is capped at the desk's ledger quantity AND the broker's long quantity.
- **Floor limits**: orders/tick and open positions read from params act as minimums (10 / 30) with hard ceilings (20 / 50).

## Reconcile (floor-owned only)
Only orders with the floor's `cf-` (or synthetic `rc-`) client id count as floor-owned. Each tick compares the floor's ledger
with the broker's long quantity per symbol. If the books claim more than the broker holds (beyond 1% dust, not in flight,
no fill in the last 3 minutes), the books are reduced pro rata with a synthetic `rc-…` filled sell (venue `sim`, never sent
to the broker) plus a `reconcile` event. The floor never sells anything it did not open.

## Strategy results
`strategyStats.ts` groups closed round trips by the strategy that opened them (trades, wins, win rate, P/L, max drawdown,
average hold, open). Shown in the ROBOT tab "Strategy results" panel (7 days / all time), in the daily review (`strategies.d1/d7`)
and in the daily email "STRATEGY COMPARISON" section.

## Undo
Revert the PR. CYCLE: `delete from crypto_floor_desks where id='cycle'` (its orders stay in the ledger). Otherwise no migration; stored desk params equal to the old defaults are mapped to the new defaults at read time.

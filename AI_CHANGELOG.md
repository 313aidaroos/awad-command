# AI Change Log

## Rules for AI models, bots, and agents

If you are an AI (Claude, ChatGPT, Grok, Gemini, Copilot, Cursor, JunoAI, or any other model, bot, or agent) and you add, modify, or delete anything in this repository, you **must** append a dated entry to this file describing what you changed and why — one entry per work session, no exceptions. This log is how the repository owner tracks what every AI did. Human commits do not need entries.

Entry format:

## YYYY-MM-DD — <your name/model>
- Changed: <files or area>
- Why: <reason>

---

## 2026-09-28 — JunoAI
- Changed: created this file
- Why: owner's standing rule — every AI that touches this repo must log its changes here

## 2026-09-30 — Claude (branch claude/awesome-newton-3tygzi)
- Changed: removed `src/lib/apixis-wallet.ts` (SDK v2 copy; nothing imported it). COMMAND is not a Wallet client by design.
- Why: family backend pass per Awad's 2026-09-30 decisions (ApixisWallet/AGENTS.md §0c D11–D16; live board: ApixisWallet/docs/FAMILY_STATUS.md). One SDK, one login kit, one world kit — copied from canonical, never patched by hand.

## 2026-10-02 — Claude (branch claude/gracious-brahmagupta-2w2bcc)
- Changed: Crypto Floor robot rebuilt (v2). New `src/lib/crypto-floor/*` (engine, tick runner, Alpaca client, per-desk ledger, 4 strategies incl. new swing-v1 and breakout-v1, daily review + learning, daily email, backtester, shadow strategy tests, desk-agent chat, floor state); routes `/api/crypto-floor/{tick,review,snapshot,control,lab,chat,place-order,events}`; UI: robot status bar + kill switch, ROBOT / CHAT / LAB tabs, in-page manual order form (`src/crypto-floor/RobotConsole.tsx`, edits in `CryptoFloor.tsx`, `floor.css`, `model.ts` desk labels); Cixy `trading_floor` tool now includes the robot; `vercel.json` daily review cron; middleware lets the review cron through (bearer-checked in the route); strategy tests fixed (`@jest/globals` → `vitest`, a broken dip fixture). Migration `20261002000000_crypto_floor_robot_v2.sql` written AND applied to the hub DB (additive); `20260928010000_crypto_floor_events.sql` made a no-op. Notes: `NOTES/CLAUDE.md`, `docs/crypto-floor/ROBOT-SPEC.md` status block, `AGENTS.md`.
- Why: Awad asked to fix everything from the audit and make the floor functional: robot trading 24/7, four teams testing strategies, talk to the leads, a daily email to awad@apixis.dev, all visible in the command center. The v1 robot had run for days without one order (wrong bar window and symbol key, dip-v1 never called, order_filled blocked by a unique index, halts that never resumed, shared-account equity).

## 2026-10-02 — Claude (Coinbase real-money venue, built OFF)
- Changed: new `src/lib/crypto-floor/coinbase.ts` (Coinbase Advanced Trade client, CDP JWT ES256/Ed25519 via node:crypto), `live.ts` (pure real-money planner: owner switch per desk, hard USD limits, kill switch, transfer-key refusal, own `live:<desk>` ledger, sells capped by Coinbase balance, 1h back-off after rejections), `liveRun.ts` (tick step: read Coinbase each tick, reconcile, place orders only for switched-on desks); owner-only `/api/crypto-floor/control` actions `live_on` (typed REAL MONEY + key re-check) / `live_off` / `live_limits`; UI panel "Real money · Coinbase" (setup steps, balances, key check, switches, limits) and status-bar line; real-money section in the daily email; agents/Cixy see real-money status (read-only). Migration `20261002010000_crypto_floor_coinbase.sql` written AND applied (additive; all desks live_enabled=false; limits 100/25/10). Docs: KEYS_TOMORROW.md §5, ROBOT-SPEC status, AGENTS.md, NOTES/CLAUDE.md.
- Why: Awad asked to connect the Crypto Floor to Coinbase so it is ready for real money, keeping trading on Alpaca paper until he flips it live.

## 2026-10-02 — Claude (RONIN team + learning loop for every team)
- Changed: new `src/lib/crypto-floor/strategy/custom-v1.ts` (+ tests; strategy rule language + validator + runner), `training.ts`, `notes.ts`, `research.ts` (team meetings + daily all-hands), route `/api/crypto-floor/research` (cron hourly :20 + owner POST), `lab.ts` (spec support, `HistoryCache`, evidence gate `judgeBacktest`/`judgeExperiment`, `adoptChange`; + `lab.test.ts`), engine/live/tick/backtest/state/review/report/dailyReport/agentChat/desks/types/strategies for the 5th desk RONIN (per-desk coins, spec, day-loss limit), chat/control/lab route enums, `vercel.json` cron, middleware public path, UI: RONIN chat thread, strategy view on the desk card, plain "Team journals & meetings" panel in LAB; Cixy sees team learning. Migrations `20261002020000_crypto_floor_learning.sql` (applied) and `20261002020100_crypto_floor_ronin.sql` (applied after deploy). Docs: NOTES/CLAUDE.md, ROBOT-SPEC status, AGENTS.md.
- Why: Awad asked for a riskier team that invents its own strategies and learns as it goes, and for ALL teams to take notes, learn, implement and hold meetings, trained as experts in their roles and cross-trained. Real money stays owner-only and OFF.

## 2026-10-02 — Claude (fix: adding a desk is not P&L)
- Changed: `engine.ts` floor start-of-day equity = sum of each desk's own baseline (was a separate floor row); `state.ts` same; `review.ts` floor 24h P&L = sum of desk P&L; tests.
- Why: RONIN was added mid-day and the floor showed "+$25,000 today" (its capital counted as profit), which also loosened the floor −2% day-loss pause for the rest of the day.


## 2026-10-02 — Claude (Awad's coins on every desk)
- Changed: `types.ts` OWNER_COINS (XRP, DOGE, SOL, PEPE, XLM, HBAR, BILL — Awad's Robinhood holdings) first in every desk's coin list + BTC/ETH; RONIN_UNIVERSE widened to match (+AVAX/LINK/LTC); `alpaca.ts` reads Alpaca's crypto asset list (skip pairs Alpaca doesn't carry, round qty to the pair's increment, respect minimum size); tick reports `notOnAlpaca`; training update tells every team. RONIN's stored spec universe updated in the DB (owner-directed).
- Why: Awad (screenshot of his Robinhood): "have all them watch these and buy more of these". Paper only — Robinhood is not connected.

## 2026-10-02 — Claude (Trades & P/L box + "Email me this")
- Changed: `RobotConsole.tsx` new `TradesBox` (floor value, today / all-time / open P/L, per-team P/L, open positions, latest orders, closed trades; live with the 10s poll) shown on top of `/crypto-floor`; new owner route `/api/crypto-floor/email` + `dailyReport.ts sendFloorUpdate` (emails the current trades + P/L to the report address now; no tuning, no AI call).
- Why: Awad asked for a box on the crypto floor with trades, P/L and other relevant info, and an option to send it to his email.

## 2026-10-02 — Claude (Trades & P/L box moved down)
- Changed: `CryptoFloor.tsx` — the Trades & P/L box now sits below the floor illustrations (above the footer) instead of under the status bar.
- Why: Awad wants the illustrations first, then scroll down to trades and P/L.

## 2026-10-02 — Grok (Developer Bot, for Awad; branch grok/crypto-floor-riskier-2026-10-02)
- Changed: Crypto floor made riskier on paper: 5 desks with side-by-side strategy lanes (new `trend-v1`, `meanrev-v1`, `scalp-v1`, `options-v1`), US stocks (regular + extended hours) and long options on ORBIT (regular hours), looser entry rules and bigger sizes, per-desk hard daily loss caps (owner-only), defined max loss per options position, floor-owned reconcile, own Alpaca keys only (`CRYPTO_FLOOR_ALPACA_*`, no fallback to `ALPACA_*`). UI (robot bar, desk cards, strategy results, log) shows all of it plus a "no own account" banner. Docs: `docs/crypto-floor/RISKIER-FLOOR.md`, `.env.example`, `NOTES/GROK.md`. No env set, no migration, no deploy.
- Why: Awad asked for a riskier floor that trades crypto, stocks and options on its own paper account with hard per-desk loss limits. Undo: revert the PR.

## 2026-10-03 — Grok (Developer Bot, for Awad; branch grok/crypto-floor-riskier-2026-10-02)
- Changed: 6th crypto-floor desk CYCLE (`cycle-straddle-v1`): new `strategy/cycle-straddle-v1.ts` (cycle detector on 1y daily bars, Monday entry, per-leg +50% exit, −50% combined and trading-day-15 exits), straddle order path in `engine.ts` (both legs or nothing, $500 debit cap `STRADDLE_MAX_DEBIT_USD`, max 4 open), daily bars + straddle chains in `tick.ts`, `optionChain` pagination, desk roster/lanes/assets, lab/live refuse CYCLE, team playbook + meeting slot, `CycleDeskView` in the snapshot and a CYCLE block in the desk card (straddles + cycle screen), "Paper only" in the real-money table for non-crypto desks. Tests `cycle-straddle.test.ts`. Migration `20261003000000_crypto_floor_cycle.sql` written, NOT applied. Docs: `RISKIER-FLOOR.md`, `ROBOT-SPEC.md`, `AGENTS.md`, `NOTES/GROK.md`.
- Why: Awad's idea that prices move in a ~3-week cycle; he asked for a weekly long-straddle desk on paper. Undo: revert the commit; `delete from crypto_floor_desks where id='cycle'` if the migration was applied.

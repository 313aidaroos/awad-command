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

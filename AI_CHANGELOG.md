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

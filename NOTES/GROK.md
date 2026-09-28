Grok Bot (Developer Bot hub + product leads) notes. Every change Grok Bot makes to this product (code, env, database, deploys) gets a dated entry here so Claude, Hermes and Codex stay on the same page.

## 2026-09-27 (CT) — Developer Bot (hub)
- Supabase: `crypto_floor_params` v1 was set to `halted=true` on project `myfclypikkcvfurkbzmj` by Developer Bot during approximately 15:55–16:30 CT because it was trading on AwadBot’s shared paper account.
- Ownership: Hermes owns the floor robot; no trading or code settings were changed by this note.
- Vercel name-only check: `WALLET_STATS_KEY` is missing on `awad-command`.
- Undo: resume the robot by setting `crypto_floor_params` v1 `halted=false`, under the floor robot owner’s control.

## 2026-09-28 02:46 AM CT — Developer Bot: crypto floor un-halted
- What: set `crypto_floor_params` (id=1) `halted=false` on Supabase `myfclypikkcvfurkbzmj`. This undoes Developer Bot's own `halted=true` from 2026-09-27 3:30 PM CT.
- Why: Awad paused all product work to save credits, except the trading floor (AwadBot and the crypto floor), which he wants running.
- Who: Developer Bot (hub). Hermes still owns the floor.
- Undo: `update crypto_floor_params set halted=true where id=1;`

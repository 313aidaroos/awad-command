Grok Bot (Developer Bot hub + product leads) notes. Every change Grok Bot makes to this product (code, env, database, deploys) gets a dated entry here so Claude, Hermes and Codex stay on the same page.

## 2026-09-27 (CT) — Developer Bot (hub)
- Supabase: `crypto_floor_params` v1 was set to `halted=true` on project `myfclypikkcvfurkbzmj` by Developer Bot during approximately 15:55–16:30 CT because it was trading on AwadBot’s shared paper account.
- Ownership: Hermes owns the floor robot; no trading or code settings were changed by this note.
- Vercel name-only check: `WALLET_STATS_KEY` is missing on `awad-command`.
- Undo: resume the robot by setting `crypto_floor_params` v1 `halted=false`, under the floor robot owner’s control.

# COMMAND (awad-command): launch notes

_Updated 2026-09-25. One notes file per repo: what was changed, file by file, and everything you need to connect. The full family report: https://claude.ai/artifact/QERxA6PMsFK1vdR51Ex2NQ_

## Status

Private owner dashboard. Code merged. Needs keys (see `docs/KEYS_TOMORROW.md`, the full step-by-step).

## Connect (in order)

1. Follow `docs/KEYS_TOMORROW.md` in order: sign-in → Anthropic → `WALLET_STATS_KEY` → email OAuth → Alpaca paper.

Every key this repo reads is listed in `.env.example` (required, optional, and legacy names to leave unset).

## OAuth apps

- **Google (Gmail)**: Google Cloud project, enable Gmail API, OAuth consent screen External + *In production*, scopes `gmail.readonly` + `gmail.compose`, redirect `https://awad-command.vercel.app/api/mail/callback/google` → `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
- **Microsoft (Outlook)**: Entra app registration, redirect `https://awad-command.vercel.app/api/mail/callback/microsoft`, delegated `offline_access openid email User.Read Mail.ReadWrite Mail.Send` → `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`.
- `MAIL_TOKEN_KEY`: random 32+ chars; encrypts mailbox tokens at rest.

## Apixis Wallet

Reads the Wallet through `WALLET_STATS_KEY` (read-only). Does not sell anything, so it needs no `WALLET_API_KEY`.

## Database

`awad_command.mail_accounts` applied live (2026-09-23).

## Open items

- Paper trading only, by decision.

## What changed, file by file

| File | Change |
|---|---|
| `.env.example` | Added 7 key(s) the code reads that were missing: `CIXY_VOICE_ID`, `ELEVENLABS_API_KEY`, `SUPABASE_URL`, `APIXIS_WALLET_API_KEY`, `STRIPE_SECRET_KEY`, `TWITTER_BEARER_TOKEN`, `X_API_BEARER_TOKEN`. |
| `README.md` | Part of: Go-live docs, re-enable Stripe summary, lint cleanup. |
| `docs/KEYS_TOMORROW.md` | Part of: Go-live docs, re-enable Stripe summary, lint cleanup. |
| `docs/LAUNCH_NOTES.md` | This file. |
| `docs/NOW.md` | Part of: Go-live docs, re-enable Stripe summary, lint cleanup. |
| `docs/WALLET_EMBED.md` | Part of: Go-live docs, re-enable Stripe summary, lint cleanup. |
| `src/app/analytics/page.tsx` | Part of: Go-live docs, re-enable Stripe summary, lint cleanup. |
| `src/app/api/mail/accounts/route.ts` | Part of: Connect every mailbox: Gmail + Outlook for Cixy, unified inbox, reply drafts, owner-only Send. |
| `src/app/api/mail/callback/[provider]/route.ts` | Part of: Connect every mailbox: Gmail + Outlook for Cixy, unified inbox, reply drafts, owner-only Send. |
| `src/app/api/mail/connect/[provider]/route.ts` | Part of: Connect every mailbox: Gmail + Outlook for Cixy, unified inbox, reply drafts, owner-only Send. |
| `src/app/api/mail/draft/route.ts` | Part of: Connect every mailbox: Gmail + Outlook for Cixy, unified inbox, reply drafts, owner-only Send. |
| `src/app/api/mail/inbox/route.ts` | Part of: Connect every mailbox: Gmail + Outlook for Cixy, unified inbox, reply drafts, owner-only Send. |
| `src/app/api/mail/send/route.ts` | Part of: Connect every mailbox: Gmail + Outlook for Cixy, unified inbox, reply drafts, owner-only Send. |
| `src/app/api/mission-control/route.ts` | Part of: Connect Apixis Wallet: live business graph, home finances, Cixy tools, faster floor. |
| `src/app/api/wallet/summary/route.ts` | Part of: Connect Apixis Wallet: live business graph, home finances, Cixy tools, faster floor. |
| `src/app/automations/page.tsx` | Part of: Go-live docs, re-enable Stripe summary, lint cleanup. |
| `src/app/books/page.tsx` | Part of: Go-live docs, re-enable Stripe summary, lint cleanup. |
| `src/app/content/page.tsx` | Part of: Go-live docs, re-enable Stripe summary, lint cleanup. |
| `src/app/projects/page.tsx` | Part of: Go-live docs, re-enable Stripe summary, lint cleanup. |
| `src/app/strategy/page.tsx` | Part of: Go-live docs, re-enable Stripe summary, lint cleanup. |
| `src/app/system/page.tsx` | Part of: Go-live docs, re-enable Stripe summary, lint cleanup. |
| `src/app/wallet/WalletRoom.tsx` | Part of: Connect Apixis Wallet: live business graph, home finances, Cixy tools, faster floor. |
| `src/ceo/applyClientActions.ts` | Part of: Connect every mailbox: Gmail + Outlook for Cixy, unified inbox, reply drafts, owner-only Send. |
| `src/ceo/buildContext.ts` | Part of: Connect Apixis Wallet: live business graph, home finances, Cixy tools, faster floor. |
| `src/ceo/runCeoTurn.ts` | Part of: Connect Apixis Wallet: live business graph, home finances, Cixy tools, faster floor. |
| `src/ceo/tools.ts` | Part of: Connect every mailbox: Gmail + Outlook for Cixy, unified inbox, reply drafts, owner-only Send. |
| `src/ceo/tools.types.ts` | Part of: Connect every mailbox: Gmail + Outlook for Cixy, unified inbox, reply drafts, owner-only Send. |
| `src/crypto-floor/CryptoFloor.tsx` | Part of: Connect Apixis Wallet: live business graph, home finances, Cixy tools, faster floor. |
| `src/email/Inboxes.tsx` | Part of: Connect every mailbox: Gmail + Outlook for Cixy, unified inbox, reply drafts, owner-only Send. |
| `src/email/Mailroom.tsx` | Part of: Connect every mailbox: Gmail + Outlook for Cixy, unified inbox, reply drafts, owner-only Send. |
| `src/landing/AppShell.tsx` | Part of: Go-live docs, re-enable Stripe summary, lint cleanup. |
| `src/landing/Panels.tsx` | Part of: Connect Apixis Wallet: live business graph, home finances, Cixy tools, faster floor. |
| `src/landing/useLandingData.ts` | Part of: Connect Apixis Wallet: live business graph, home finances, Cixy tools, faster floor. |
| `src/lib/apixis-wallet.ts` | Part of: Connect Apixis Wallet: live business graph, home finances, Cixy tools, faster floor. |
| `src/lib/branding.test.ts` | Test added or updated to match. |
| `src/lib/ceoBridge.ts` | Part of: Connect every mailbox: Gmail + Outlook for Cixy, unified inbox, reply drafts, owner-only Send. |
| `src/lib/dashboardData.ts` | Part of: Connect Apixis Wallet: live business graph, home finances, Cixy tools, faster floor. |
| `src/lib/mail/accounts.ts` | Part of: Connect every mailbox: Gmail + Outlook for Cixy, unified inbox, reply drafts, owner-only Send. |
| `src/lib/mail/crypto.ts` | Part of: Connect every mailbox: Gmail + Outlook for Cixy, unified inbox, reply drafts, owner-only Send. |
| `src/lib/mail/format.ts` | Part of: Go-live docs, re-enable Stripe summary, lint cleanup. |
| `src/lib/mail/google.ts` | Part of: Go-live docs, re-enable Stripe summary, lint cleanup. |
| `src/lib/mail/http.ts` | Part of: Connect every mailbox: Gmail + Outlook for Cixy, unified inbox, reply drafts, owner-only Send. |
| `src/lib/mail/mail.test.ts` | Test added or updated to match. |
| `src/lib/mail/microsoft.ts` | Part of: Go-live docs, re-enable Stripe summary, lint cleanup. |
| `src/lib/mail/oauth.ts` | Part of: Go-live docs, re-enable Stripe summary, lint cleanup. |
| `src/lib/mail/types.ts` | Part of: Connect every mailbox: Gmail + Outlook for Cixy, unified inbox, reply drafts, owner-only Send. |
| `src/lib/missionControl.support.test.ts` | Test added or updated to match. |
| `src/lib/missionControl.ts` | Part of: Connect Apixis Wallet: live business graph, home finances, Cixy tools, faster floor. |
| `src/lib/payments.ts` | Part of: Go-live docs, re-enable Stripe summary, lint cleanup. |
| `src/lib/supabase/middleware.ts` | Part of: Lock Mission Control to the owner; fix duplicate Outreach agents; update stale tests. |
| `src/lib/walletEmbed.ts` | Part of: Connect Apixis Wallet: live business graph, home finances, Cixy tools, faster floor. |
| `src/lib/walletStats.test.ts` | Test added or updated to match. |
| `src/lib/walletStats.ts` | Part of: Connect every mailbox: Gmail + Outlook for Cixy, unified inbox, reply drafts, owner-only Send. |
| `src/projects/teams.test.ts` | Test added or updated to match. |
| `src/projects/teams.ts` | Part of: Lock Mission Control to the owner; fix duplicate Outreach agents; update stale tests. |
| `src/ui/CeoConsole.tsx` | Part of: Go-live docs, re-enable Stripe summary, lint cleanup. |
| `src/ui/EmailDraftCard.tsx` | Part of: Connect every mailbox: Gmail + Outlook for Cixy, unified inbox, reply drafts, owner-only Send. |
| `supabase/migrations/20260923080000_mail_accounts.sql` | Part of: Connect every mailbox: Gmail + Outlook for Cixy, unified inbox, reply drafts, owner-only Send. |

_Changes are backend and plumbing only. Pages, design and UI are not changed except where noted as a build or lint fix with no visual change._

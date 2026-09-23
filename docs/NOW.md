# Command: where things stand (2026-09-23)

Done:
- **Security:** `/api/mission-control` is owner-only again. It reads revenue, leads and admin status.
- **Apixis Wallet:** live graph at `/wallet`. The home finance chart uses Wallet daily cash, and Cixy has a `wallet_summary` tool. The Wallet side is the read-only `/api/v1/admin/summary` endpoint.
- **Email:** connect any number of Gmail / Outlook inboxes in the Mailroom. Cixy has overview, search, read and reply-draft tools. Only your Send tap sends.
- **Crypto Floor:** refreshes every 5 s. Cixy has a `trading_floor` tool (paper account).
- **Stripe:** `stripe_summary` is re-enabled (the `stripe` package installs fine).
- **Agents:** duplicate Outreach agents fixed. Each business has 12 agents plus one Outreach seat.

Waiting on you: every key in [KEYS_TOMORROW.md](KEYS_TOMORROW.md).

Not started:
- 15-minute decision cap
- Live-money trading venue (paper only by decision)

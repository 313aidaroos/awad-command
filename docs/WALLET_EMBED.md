# COMMAND ↔ Apixis Wallet

COMMAND does not take cards and does not keep a second Ixis ledger. Customers buy Ixis on Apixis Wallet. Cash is credited there when the Wallet Stripe webhook writes the ledger. Sister sites, including COMMAND, redeem.

`src/lib/walletClient.ts` stays the redeem client (quote → reserve → capture / release). It is not checkout.

## Deep link

Buy Ixis and Wallet open the Wallet app.

Base: `NEXT_PUBLIC_WALLET_URL`, default `https://apixis-wallet.vercel.app`.

Query string, built with `URLSearchParams`:

| Param | Value |
|---|---|
| `origin` | `command` |
| `return_url` | COMMAND `/wallet` on an allowlisted host |

Allowlist:

- `https://awad-command.vercel.app`
- `http://localhost` and `https://localhost` (any port)
- `http://127.0.0.1` and `http://[::1]` (any port)

Any other origin, including Vercel preview hosts, uses the production return URL. COMMAND builds that URL itself. It does not forward a caller-supplied redirect.

Example:

```
https://apixis-wallet.vercel.app/?origin=command&return_url=https%3A%2F%2Fawad-command.vercel.app%2Fwallet
```

Local COMMAND (`http://localhost:43180/wallet`) sends `return_url=http://localhost:43180/wallet`.

ApixisWallet `main` has no `docs/WALLET_EMBED.md` yet (checked 2026-09-21). This file is COMMAND’s side of the embed. When Wallet publishes a buy-view parameter, match it in `src/lib/walletEmbed.ts`.

## Balance

`GET /api/wallet/balance` sends the signed-in COMMAND session as `Authorization: Bearer` to Wallet `GET /api/v1/wallet` (see ApixisWallet `docs/INTEGRATION.md`).

The UI shows that `available` number only when it is a finite count of Ixis. No session, HTTP error, or `available: null` shows **Open Wallet** and no balance. COMMAND does not substitute a ledger total or a demo figure.

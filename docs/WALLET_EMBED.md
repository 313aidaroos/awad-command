# COMMAND ↔ Apixis Wallet

COMMAND does not take cards and does not keep a second Ixis ledger. Customers buy Ixis on Apixis Wallet. Cash is credited there when the Wallet Stripe webhook writes the ledger. Sister sites, including COMMAND, redeem.

`src/lib/apixis-wallet.ts` is the redeem client (quote → reserve → capture / release), synced from the Wallet repo's `sdk/apixis-wallet.ts` (v2). It is server only and not checkout. Browser code uses `src/lib/walletEmbed.ts` (`walletDeepLink`, `walletBuyUrl`).

## Business summary (owner graph)

`/wallet`, the home finance chart and Cixy read `GET /api/v1/admin/summary?days=N` on the Wallet with `Authorization: Bearer $WALLET_STATS_KEY`, proxied by COMMAND's owner-only `GET /api/wallet/summary`. The key is read-only and must be identical on both Vercel projects.

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

**Buy Ixis** goes to Wallet `/buy?product=command&return_url=…`. The Wallet allowlists `awad-command.vercel.app` as a return host.

## Personal balance

COMMAND does not show a per-user Ixis balance. That needs a Wallet user token, which a separate Supabase project can't forward until Apixis ID (one shared login) ships. `readWalletBalance` in `walletEmbed.ts` is ready for that.

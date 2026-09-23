# Keys and switches: go-live checklist

This is the one list for getting COMMAND fully live. Do the steps in order. Every value goes into **Vercel → Project → Settings → Environment Variables** (Production and Preview) unless the step says otherwise. Redeploy after you change any variable.

Generate each random secret with `openssl rand -base64 48`. Any password generator that gives 40 or more characters also works.

---

## 0. Merge the code (5 min)

1. **Apixis Wallet** repo: merge branch `claude/sweet-rubin-ie2ght` into `main`. It adds the read-only `/api/v1/admin/summary` endpoint. There is no migration.
2. **awad-command** repo: merge `claude/sweet-rubin-ie2ght` into `master`.
3. The database is already done. `awad_command.mail_accounts` was applied to the live project `myfclypikkcvfurkbzmj`, and every earlier COMMAND migration was already live.

## 1. Sign-in (required: the whole site is locked without it)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://myfclypikkcvfurkbzmj.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page → service_role / secret key. **Server only.** |
| `ALLOWED_EMAIL` | The email you sign in with, e.g. `awad@apixis.dev` |
| `NEXT_PUBLIC_SITE_URL` | `https://awad-command.vercel.app` |

In Supabase → Authentication → URL Configuration, add `https://awad-command.vercel.app/auth/callback` to the Redirect URLs.

## 2. Cixy's brain (required for real answers)

| Variable | Value |
|---|---|
| `AI_PROVIDER` | `anthropic` |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys |
| `ANTHROPIC_MODEL` | `claude-sonnet-5` (default) |

## 3. Apixis Wallet graph (the live money chart)

1. Generate one secret.
2. Set it as `WALLET_STATS_KEY` on **both** Vercel projects, Apixis Wallet and awad-command, using exactly the same value.
3. Redeploy both.
4. Open `/wallet` in COMMAND. The status line should say **LIVE**.
   - "rejected" means the two values differ.
   - "not deployed" means the Wallet branch hasn't been merged or deployed yet.

The key is read-only. It cannot move Ixis or money.

## 4. Email: connect all your inboxes

### 4a. Shared secret

- `MAIL_TOKEN_KEY`: a new random secret. It encrypts your mailbox tokens. If you change it later, you must reconnect every mailbox.

### 4b. Gmail (personal Gmail and Google Workspace), about 10 min

1. Go to [console.cloud.google.com](https://console.cloud.google.com), create a project named "Awad Command", then open APIs & Services → Library and enable the **Gmail API**.
2. Set up the OAuth consent screen:
   - User type: **External**, so personal Gmail and @apixis.dev can both connect.
   - Fill in the app name and your email.
   - Scopes: add `.../auth/gmail.readonly` and `.../auth/gmail.compose`.
   - Add yourself (every Gmail address you'll connect) as a test user.
   - Then press **Publish app → In production**. In "Testing" mode Google expires the connection every 7 days.
   - Google will show "Google hasn't verified this app" when you connect. Click Advanced → Go to Awad Command. That's normal for a private app.
3. Go to Credentials → Create credentials → OAuth client ID → Web application:
   - Authorized redirect URI: `https://awad-command.vercel.app/api/mail/callback/google`
   - For local dev, also add `http://localhost:43180/api/mail/callback/google`.
4. Copy the client ID and secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### 4c. Outlook / Hotmail / Microsoft 365, about 10 min (skip if you don't use it)

1. Go to [entra.microsoft.com](https://entra.microsoft.com) → App registrations → New registration:
   - Name: Awad Command.
   - Supported accounts: **any organizational directory and personal Microsoft accounts**.
   - Redirect URI (Web): `https://awad-command.vercel.app/api/mail/callback/microsoft`.
2. The **Application (client) ID** goes into `MICROSOFT_CLIENT_ID`.
3. Certificates & secrets → New client secret (24 months). Copy its **Value** into `MICROSOFT_CLIENT_SECRET`. Put a calendar reminder before it expires.
4. API permissions → Microsoft Graph → Delegated: `offline_access`, `openid`, `email`, `User.Read`, `Mail.ReadWrite`, `Mail.Send`.

### 4d. Connect

1. Open `/email`.
2. Press **+ Connect Gmail** or **+ Connect Outlook** once for each account. Add as many as you like.
3. Then ask Cixy: *"what's in my email?"*

What Cixy can and can't do with email:
- She can read, search, summarize, and **draft** replies in the same thread.
- Drafts land in your real Drafts folder and show a **Send** card in her chat.
- **Only your Send tap sends.** Cixy has no send tool.

## 5. Crypto Floor (paper trading, live every 5 s)

| Variable | Value |
|---|---|
| `TRADE_MODE` | `paper` |
| `ALPACA_API_KEY` / `ALPACA_SECRET_KEY` | Keys from the Alpaca **paper** dashboard for the account AwadBot trades |
| `AWADBOT_STATUS_URL` + `DASHBOARD_PASSWORD` | Optional: AwadBot's `/api/status` for heartbeat and halt |

`AWADBOT_JOURNAL_DIR` only works where COMMAND runs on the same machine as AwadBot. It does nothing on Vercel. Live-money hosts are refused, and COMMAND never places orders.

## 6. Optional

| Variable | What it turns on |
|---|---|
| `STRIPE_READONLY_KEY` | Cixy's `stripe_summary` (Stripe → Developers → API keys → restricted key, read-only) |
| `RESEND_API_KEY` | Drafts sent from @apixis.dev aliases in the Mailroom |
| `LEAD_MESSAGE_WEBHOOK_URL` / `LEAD_MESSAGE_WEBHOOK_SECRET` | Cixy messaging your product Lead bots |
| `X_BEARER_TOKEN`, `NEWS_API_KEY` | News / X feeds on the home page |
| `ELEVENLABS_API_KEY`, `CIXY_VOICE_ID` | Cixy's premium voice (otherwise the browser voice) |
| Worker on Railway | Agent tasks actually run. See `worker/README.md` |

## Smoke test (2 min)

1. Sign in with the magic link. You should land on HQ.
2. Home finances panel: the chart shows Wallet daily cash, or a line telling you to connect the Wallet.
3. `/wallet` says LIVE and has a graph.
4. `/crypto-floor` shows equity and positions, and the engine reads CONNECTED or TRADING.
5. `/email` lists your connected inboxes.
6. Ask Cixy: *"Morning briefing"* → she covers sites, Wallet sales, email that needs a reply, and the floor.
7. Ask Cixy to draft a reply to one email. Check that it's in your Drafts, then tap Send on the card.

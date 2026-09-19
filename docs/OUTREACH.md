# Outreach desk — do not delete

Owner supplies up to 50 contacts. Agents draft. Owner Approves. One send. No hunt.

## Where it lives

| Piece | Path |
|---|---|
| UI | `/outreach` |
| API | `POST /api/outreach` `{ projectSlug, rows[] }` |
| Letters | `src/projects/outreachLetters.ts` |
| Seat on every company | `src/projects/outreach.ts` + `makeAgents` in `src/projects/factory.ts` |
| Cap | `OUTREACH_LIMIT = 50` |
| Send | Mailroom `/email` → `sendEmailDraft` (Resend) |

CSV columns: `name,house,email,why`

## Letter shape (locked voice)

Good afternoon {First},

My name is Awad. I developed something you would find very, very useful…

{company pitch}

Two uses that pay for themselves:
1. …
2. …

Why I am writing you: {why}

Reply. Sample or no. No second mail.

## Rules that do not bend

- Do not invent emails.
- Do not scrape inboxes.
- Do not send twice.
- Do not skip Approve.
- Cixy native voice is never a SKU.
- Lyrixis does not open Kindle / scrape stores.

If you change a company product, update the two uses in `outreachLetters.ts` in the same PR.

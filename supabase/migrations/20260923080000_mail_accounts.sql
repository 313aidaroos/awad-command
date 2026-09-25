-- Change note (Claude, Sep 2026): New table awad_command.mail_accounts (applied live 2026-09-23). See docs/LAUNCH_NOTES.md.
-- Connected mailboxes (Gmail / Outlook) for Cixy. Owner only, through server routes.
-- refresh_token_enc is AES-256-GCM ciphertext (MAIL_TOKEN_KEY); the database never sees a usable token.
create table if not exists awad_command.mail_accounts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  provider text not null check (provider in ('google','microsoft')),
  email text not null,
  refresh_token_enc text not null,
  scopes text,
  status text not null default 'active' check (status in ('active','error','revoked')),
  last_error text,
  unique (provider, email)
);
alter table awad_command.mail_accounts enable row level security;
revoke all on awad_command.mail_accounts from public, anon, authenticated;
grant select, insert, update on awad_command.mail_accounts to service_role;
comment on table awad_command.mail_accounts is 'Owner-only connected mailboxes. Encrypted refresh tokens. Access through authenticated server routes only.';

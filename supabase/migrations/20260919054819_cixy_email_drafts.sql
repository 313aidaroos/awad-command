create table if not exists awad_command.email_drafts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  recipient text not null,
  sender text not null,
  subject text not null,
  body text not null,
  status text not null default 'draft' check (status in ('draft','sending','submitted','unconfirmed')),
  provider_id text
);
alter table awad_command.email_drafts enable row level security;
revoke all on awad_command.email_drafts from anon, authenticated;
grant select,insert,update on awad_command.email_drafts to service_role;
comment on table awad_command.email_drafts is 'Owner-only mail drafts. Access through authenticated server routes; never expose via the browser database client.';

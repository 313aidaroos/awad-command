create table if not exists awad_command.payment_requests (
 id uuid primary key default gen_random_uuid(),created_at timestamptz not null default now(),
 merchant text not null,purpose text not null,amount_cents bigint not null check(amount_cents>0),currency text not null check(currency='usd'),checkout_url text,
 status text not null default 'pending' check(status in ('pending','approved','declined')),decided_at timestamptz
);
alter table awad_command.payment_requests enable row level security;
revoke all on awad_command.payment_requests from anon,authenticated;
grant select,insert,update on awad_command.payment_requests to service_role;

-- Crypto Floor robot v2 (2026-10-02, Claude).
-- Additive only. Keeps every existing row in crypto_floor_events / crypto_floor_params / crypto_floor_snapshot.
--
-- 1. Repo drift: crypto_floor_params and crypto_floor_events.strategy already exist on the hub DB
--    (created by hand on 2026-09-27); this file is now the record of them.
-- 2. crypto_floor_events.order_id was UNIQUE, so order_submitted and order_filled could never both carry
--    the same client_order_id (the fill insert failed silently). Uniqueness is now per (type, order_id).
-- 3. New tables: desks (one strategy per desk), orders (the ledger), daily baselines, daily reports,
--    chat messages with desk agents, strategy experiments, parameter change log.
-- All tables: RLS on, no anon/authenticated access. Server routes use the service role.

-- 1. Params (kill switch + floor-wide limits). Single row id=1.
create table if not exists public.crypto_floor_params (
  id integer primary key default 1,
  version integer not null default 1,
  halted boolean not null default false,
  entry_threshold_pct numeric not null default 2.0,
  exit_stop_pct numeric not null default -1.5,
  exit_take_pct numeric not null default 3.0,
  position_size_pct numeric not null default 2.0,
  max_open_positions integer not null default 3,
  min_entry_interval_hours integer not null default 4,
  halt_day_loss_pct numeric not null default -2.0,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);
insert into public.crypto_floor_params (id) values (1) on conflict (id) do nothing;

alter table public.crypto_floor_params add column if not exists halt_reason text;
alter table public.crypto_floor_params add column if not exists halted_at timestamptz;
alter table public.crypto_floor_params add column if not exists halted_by text;
alter table public.crypto_floor_params add column if not exists day_paused_until timestamptz;
alter table public.crypto_floor_params add column if not exists day_pause_reason text;
alter table public.crypto_floor_params add column if not exists max_open_positions_total integer not null default 8;
alter table public.crypto_floor_params add column if not exists max_orders_per_tick integer not null default 3;
alter table public.crypto_floor_params add column if not exists tick_lease_until timestamptz;
alter table public.crypto_floor_params add column if not exists tick_lease_holder text;
alter table public.crypto_floor_params enable row level security;
revoke all on public.crypto_floor_params from anon, authenticated;
comment on column public.crypto_floor_params.halted is 'Master kill switch. true = no orders of any kind until the owner resets it.';
comment on column public.crypto_floor_params.day_paused_until is 'Floor day-loss pause: new entries blocked until this time (next UTC midnight). Exits still run.';
comment on column public.crypto_floor_params.entry_threshold_pct is 'Legacy (v1 single-strategy robot). Desk params now live in crypto_floor_desks.params.';

-- 2. Events: strategy tag + per-type order uniqueness.
alter table public.crypto_floor_events add column if not exists strategy text;
alter table public.crypto_floor_events drop constraint if exists crypto_floor_events_order_id_key;
create unique index if not exists crypto_floor_events_type_order_uidx
  on public.crypto_floor_events (type, order_id) where order_id is not null;
create index if not exists crypto_floor_events_strategy_idx
  on public.crypto_floor_events (strategy) where strategy is not null;

-- 3a. Desks: one deterministic strategy per desk, its own paper book.
create table if not exists public.crypto_floor_desks (
  id text primary key,
  name text not null,
  strategy text not null,
  enabled boolean not null default true,
  capital_usd numeric not null default 25000 check (capital_usd > 0),
  params jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  paused_until timestamptz,
  pause_reason text,
  updated_at timestamptz not null default now()
);
alter table public.crypto_floor_desks enable row level security;
revoke all on public.crypto_floor_desks from anon, authenticated;

insert into public.crypto_floor_desks (id, name, strategy, params) values
  ('samurai', 'SAMURAI', 'momentum-v1',
   '{"entryThresholdPct":2.0,"exitStopPct":-1.5,"exitTakePct":3.0,"positionSizePct":2.0,"maxOpenPositions":3,"minEntryIntervalHours":4}'),
  ('neon', 'NEON', 'dip-v1',
   '{"dipThresholdPct":-4.0,"dipFromHighPct":0.95,"takeProfitPct":4.0,"stopLossPct":-8.0,"positionSizePct":2.0,"scaleInEnabled":true,"scaleInDropPct":-4.0,"maxTranches":2,"minEntryIntervalHours":24,"maxHoldHours":72}'),
  ('orbit', 'ORBIT', 'swing-v1',
   '{"fastEma":20,"slowEma":50,"takeProfitPct":6.0,"stopLossPct":-3.0,"positionSizePct":2.0,"maxOpenPositions":3,"minEntryIntervalHours":12}'),
  ('phantom', 'PHANTOM', 'breakout-v1',
   '{"lookbackHours":24,"volumeMultiple":2.0,"takeProfitPct":2.5,"stopLossPct":-1.5,"maxHoldHours":24,"positionSizePct":2.0,"maxOpenPositions":3,"minEntryIntervalHours":6}')
on conflict (id) do nothing;

-- 3b. Orders: one row per order. The per-desk ledger is built from filled rows.
-- book = desk id ('samurai'…), 'manual' (owner order form) or 'exp:<uuid>' (shadow experiment).
-- mode 'paper' = sent to Alpaca paper; 'shadow' = simulated fill at the latest price, never sent anywhere.
create table if not exists public.crypto_floor_orders (
  client_order_id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  book text not null,
  desk text,
  strategy text,
  mode text not null default 'paper' check (mode in ('paper', 'shadow')),
  symbol text not null,
  side text not null check (side in ('buy', 'sell')),
  intent text check (intent in ('entry', 'scale_in', 'exit', 'manual')),
  qty numeric not null check (qty > 0),
  status text not null check (status in ('pending_submit', 'submitted', 'partially_filled', 'filled', 'canceled', 'rejected', 'unknown')),
  alpaca_order_id text,
  filled_qty numeric not null default 0,
  filled_avg_price numeric,
  filled_at timestamptz,
  reason text,
  signal jsonb not null default '{}'::jsonb,
  error text
);
create index if not exists crypto_floor_orders_book_idx on public.crypto_floor_orders (book, symbol, created_at);
create index if not exists crypto_floor_orders_open_idx on public.crypto_floor_orders (status)
  where status in ('pending_submit', 'submitted', 'partially_filled', 'unknown');
create index if not exists crypto_floor_orders_created_idx on public.crypto_floor_orders (created_at desc);
alter table public.crypto_floor_orders enable row level security;
revoke all on public.crypto_floor_orders from anon, authenticated;

-- 3c. Start-of-day equity per book (desk / experiment / 'floor'). Written once, on the first tick of each UTC day.
create table if not exists public.crypto_floor_daily (
  day date not null,
  book text not null,
  start_equity numeric not null,
  created_at timestamptz not null default now(),
  primary key (day, book)
);
alter table public.crypto_floor_daily enable row level security;
revoke all on public.crypto_floor_daily from anon, authenticated;

-- 3d. Daily review + email (one row per day; the row is the idempotency claim for the email).
create table if not exists public.crypto_floor_reports (
  day date primary key,
  created_at timestamptz not null default now(),
  summary jsonb not null default '{}'::jsonb,
  email_to text,
  email_status text not null default 'pending' check (email_status in ('pending', 'sent', 'failed', 'skipped')),
  email_id text,
  error text
);
alter table public.crypto_floor_reports enable row level security;
revoke all on public.crypto_floor_reports from anon, authenticated;

-- 3e. Owner ↔ desk agent chat.
create table if not exists public.crypto_floor_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  thread text not null,
  agent text,
  role text not null check (role in ('owner', 'agent', 'system')),
  content text not null,
  meta jsonb not null default '{}'::jsonb
);
create index if not exists crypto_floor_messages_thread_idx on public.crypto_floor_messages (thread, created_at desc);
alter table public.crypto_floor_messages enable row level security;
revoke all on public.crypto_floor_messages from anon, authenticated;

-- 3f. Strategy experiments. Running experiments trade a SHADOW book (simulated fills, no broker orders).
-- Promoting an experiment's params onto a desk requires the owner (button in the Lab tab).
create table if not exists public.crypto_floor_experiments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  desk text not null,
  strategy text not null,
  name text not null,
  hypothesis text,
  params jsonb not null,
  capital_usd numeric not null default 25000 check (capital_usd > 0),
  status text not null default 'running' check (status in ('proposed', 'running', 'stopped', 'promoted', 'rejected')),
  proposed_by text,
  started_at timestamptz,
  ends_at timestamptz,
  ended_at timestamptz,
  backtest jsonb,
  notes text
);
create index if not exists crypto_floor_experiments_status_idx on public.crypto_floor_experiments (status);
alter table public.crypto_floor_experiments enable row level security;
revoke all on public.crypto_floor_experiments from anon, authenticated;

-- 3g. Every parameter change (daily learning, promoted experiment, owner) with before/after.
create table if not exists public.crypto_floor_param_changes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  desk text,
  version integer,
  source text not null check (source in ('review', 'experiment', 'owner', 'migration')),
  reason text,
  before jsonb,
  after jsonb
);
alter table public.crypto_floor_param_changes enable row level security;
revoke all on public.crypto_floor_param_changes from anon, authenticated;

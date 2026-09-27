-- Crypto Floor: immutable event log (notebook)
-- Robot actions: signals, orders, fills, halts, reviews
-- Append-only, service_role writes only

create table if not exists crypto_floor_events (
  id uuid primary key default gen_random_uuid(),
  ts timestamptz not null default now(),
  
  -- Agent context
  desk text, -- samurai, neon, orbit, phantom (null for system events)
  agent_role text not null, -- scout, analyst, trader, risk, system
  
  -- Event type
  type text not null, -- signal, thesis, order_submitted, order_filled, order_rejected, halt, resume, review
  
  -- Trading data
  symbol text,
  side text, -- buy, sell
  qty numeric,
  price numeric,
  
  -- Flexible payload
  payload jsonb not null default '{}'::jsonb,
  
  -- Alpaca order tracking (idempotency)
  order_id text unique, -- Alpaca client_order_id, UNIQUE where not null
  
  -- Indexes
  created_at timestamptz not null default now()
);

-- RLS: service_role only (append-only)
alter table crypto_floor_events enable row level security;

revoke all on crypto_floor_events from anon;
revoke all on crypto_floor_events from authenticated;

-- Indexes for queries
create index crypto_floor_events_ts_idx on crypto_floor_events (ts desc);
create index crypto_floor_events_type_idx on crypto_floor_events (type);
create index crypto_floor_events_desk_idx on crypto_floor_events (desk) where desk is not null;
create index crypto_floor_events_symbol_idx on crypto_floor_events (symbol) where symbol is not null;
create index crypto_floor_events_order_id_idx on crypto_floor_events (order_id) where order_id is not null;

comment on table crypto_floor_events is 'Crypto Floor robot notebook: immutable append-only event log. Service-role writes only.';

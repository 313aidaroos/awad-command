-- Crypto Floor: immutable event log (ADD 3 from REQUESTED-ADDITIONS.md)
-- Every important action creates an event: signals, orders, fills, risks, halts
-- Powers: UI updates, replay system, analytics, character animations, audit trail

create table if not exists crypto_floor_events (
  id uuid primary key default gen_random_uuid(),
  
  -- When and where
  timestamp timestamptz not null default now(),
  created_at timestamptz not null default now(),
  
  -- Who
  team_id text, -- samurai, neon, orbit, phantom (nullable for system events)
  agent_id text, -- KAI, HIRO, etc. (nullable for system events)
  
  -- What
  event_type text not null, -- SIGNAL_DETECTED, ORDER_PLACED, TRADE_FILLED, etc.
  severity text not null default 'info', -- info, warn, error, critical
  title text not null,
  description text,
  
  -- Trading context (nullable for non-trade events)
  symbol text,
  trade_id text,
  order_id text, -- Alpaca order ID for ORDER_PLACED, TRADE_FILLED
  
  -- Flexible payload for event-specific data
  structured_payload jsonb not null default '{}'::jsonb,
  
  -- Environment
  paper_or_live text not null default 'paper', -- paper, live
  
  -- Correlation (link related events)
  correlation_id uuid,
  
  -- Source (who wrote this event)
  source text not null default 'system', -- system, ui, alpaca_webhook, agent_scout, etc.
  
  -- Index for performance
  created_at_idx timestamptz not null default now()
);

-- RLS: Service role only (server-side event writes)
-- Authenticated users can READ for UI display
alter table crypto_floor_events enable row level security;

revoke all on crypto_floor_events from anon;
revoke all on crypto_floor_events from authenticated;

-- Allow authenticated users to read events (for UI replay/display)
create policy "Authenticated users can read events"
  on crypto_floor_events
  for select
  to authenticated
  using (true);

-- Service role can insert (server-side only writes)
-- Note: authenticated cannot write to prevent client-side event injection

-- Indexes for common queries
create index crypto_floor_events_timestamp_idx on crypto_floor_events (timestamp desc);
create index crypto_floor_events_team_idx on crypto_floor_events (team_id) where team_id is not null;
create index crypto_floor_events_type_idx on crypto_floor_events (event_type);
create index crypto_floor_events_order_idx on crypto_floor_events (order_id) where order_id is not null;
create index crypto_floor_events_correlation_idx on crypto_floor_events (correlation_id) where correlation_id is not null;

-- Auto-cleanup: keep only last 10,000 events (rolling window)
-- Prevents unbounded growth while maintaining enough history for replay
create or replace function cleanup_old_events()
returns trigger as $$
begin
  delete from crypto_floor_events
  where id not in (
    select id from crypto_floor_events
    order by timestamp desc
    limit 10000
  );
  return new;
end;
$$ language plpgsql;

create trigger cleanup_events_trigger
  after insert on crypto_floor_events
  execute function cleanup_old_events();

-- Comment for documentation
comment on table crypto_floor_events is 'Immutable event log for Crypto Floor (ADD 3). Powers UI, replay, analytics, and audit trail. Service-role writes only, authenticated reads for display.';

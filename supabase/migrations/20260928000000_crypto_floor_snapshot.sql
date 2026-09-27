-- Crypto Floor: snapshot storage for Alpaca paper account data
-- Stores latest account state (cash, positions, orders) fetched from paper-api.alpaca.markets
-- Server-side only (service_role), no client access

create table if not exists crypto_floor_snapshot (
  id uuid primary key default gen_random_uuid(),
  updated_at timestamptz not null default now(),
  
  -- Account summary from Alpaca /v2/account
  cash numeric not null,
  portfolio_value numeric not null,
  equity numeric not null,
  
  -- Positions array from Alpaca /v2/positions (JSONB for flexibility)
  positions jsonb not null default '[]'::jsonb,
  
  -- Recent orders from Alpaca /v2/orders (JSONB)
  orders jsonb not null default '[]'::jsonb,
  
  -- Metadata
  fetched_at timestamptz not null,
  fetch_duration_ms integer,
  error_log text
);

-- RLS: Service role only (server-side API routes fetch and write)
alter table crypto_floor_snapshot enable row level security;

revoke all on crypto_floor_snapshot from anon;
revoke all on crypto_floor_snapshot from authenticated;

-- Index for fetching latest snapshot efficiently
create index crypto_floor_snapshot_updated_at_idx 
  on crypto_floor_snapshot (updated_at desc);

-- Auto-cleanup: keep only last 1000 snapshots to prevent unbounded growth
create or replace function cleanup_old_snapshots()
returns trigger as $$
begin
  delete from crypto_floor_snapshot
  where id not in (
    select id from crypto_floor_snapshot
    order by updated_at desc
    limit 1000
  );
  return new;
end;
$$ language plpgsql;

create trigger cleanup_snapshots_trigger
  after insert on crypto_floor_snapshot
  execute function cleanup_old_snapshots();

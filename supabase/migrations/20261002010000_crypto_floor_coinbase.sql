-- Crypto Floor: Coinbase (REAL MONEY) venue, built but OFF (2026-10-02, Claude).
-- Additive. Every desk starts with live_enabled = false; only the owner can switch a desk on.
-- Hard limits default to the smallest tier: $100 in open positions, $25 per buy, −$10 per UTC day.

alter table public.crypto_floor_desks add column if not exists live_enabled boolean not null default false;
alter table public.crypto_floor_desks add column if not exists live_enabled_at timestamptz;
alter table public.crypto_floor_desks add column if not exists live_enabled_by text;
comment on column public.crypto_floor_desks.live_enabled is 'REAL MONEY switch (Coinbase). Owner-only. false = Alpaca paper only.';

alter table public.crypto_floor_params add column if not exists live_max_total_usd numeric not null default 100;
alter table public.crypto_floor_params add column if not exists live_max_trade_usd numeric not null default 25;
alter table public.crypto_floor_params add column if not exists live_day_loss_usd numeric not null default 10;
alter table public.crypto_floor_params add column if not exists live_paused_until timestamptz;
alter table public.crypto_floor_params add column if not exists live_pause_reason text;
alter table public.crypto_floor_params drop constraint if exists crypto_floor_params_live_limits_check;
alter table public.crypto_floor_params add constraint crypto_floor_params_live_limits_check
  check (live_max_total_usd >= 0 and live_max_trade_usd >= 0 and live_day_loss_usd >= 0 and live_max_trade_usd <= live_max_total_usd);
comment on column public.crypto_floor_params.live_max_total_usd is 'REAL MONEY: most USD in open positions across all live desks. Owner-only.';
comment on column public.crypto_floor_params.live_max_trade_usd is 'REAL MONEY: most USD in a single buy. Owner-only.';
comment on column public.crypto_floor_params.live_day_loss_usd is 'REAL MONEY: live P&L down this much in a UTC day → no new live buys until midnight. Owner-only.';

-- Orders: 'live' mode, venue, venue order id, fees.
alter table public.crypto_floor_orders drop constraint if exists crypto_floor_orders_mode_check;
alter table public.crypto_floor_orders add constraint crypto_floor_orders_mode_check check (mode in ('paper', 'shadow', 'live'));
alter table public.crypto_floor_orders add column if not exists venue text not null default 'alpaca';
alter table public.crypto_floor_orders drop constraint if exists crypto_floor_orders_venue_check;
alter table public.crypto_floor_orders add constraint crypto_floor_orders_venue_check check (venue in ('alpaca', 'coinbase', 'sim'));
alter table public.crypto_floor_orders add column if not exists venue_order_id text;
alter table public.crypto_floor_orders add column if not exists fees numeric;
update public.crypto_floor_orders set venue = 'sim' where mode = 'shadow' and venue = 'alpaca';
comment on column public.crypto_floor_orders.mode is 'paper = Alpaca paper · shadow = simulated test fill · live = REAL MONEY on Coinbase';

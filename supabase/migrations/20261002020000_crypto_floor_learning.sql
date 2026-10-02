-- Crypto Floor: every team learns on its own (meetings, journals, evidence-gated adoption) + room for RONIN.
-- Safe for the code that runs before this deploy (only adds columns/tables, widens one check).
--  1. Desks: `spec` (custom-v1 strategy written by the team in the rule language) and `risk` (per-desk overrides,
--     e.g. RONIN's day-loss limit). Experiments: `spec` for custom-v1 tests.
--  2. Param change log accepts source 'research' (a team adopted a change after the code's evidence gate passed).
--  3. crypto_floor_notes: every team's journal (lesson/observation/plan/change/strategy/meeting) + floor briefings.
--  4. crypto_floor_meetings: one row per team meeting / daily all-hands (status, minutes, tool actions).
--  5. Floor-wide open position cap 8 → 12 (five desks; RONIN alone holds up to 4).

alter table public.crypto_floor_desks add column if not exists spec jsonb;
alter table public.crypto_floor_desks add column if not exists risk jsonb;
alter table public.crypto_floor_experiments add column if not exists spec jsonb;

alter table public.crypto_floor_param_changes drop constraint if exists crypto_floor_param_changes_source_check;
alter table public.crypto_floor_param_changes add constraint crypto_floor_param_changes_source_check
  check (source in ('review', 'experiment', 'owner', 'migration', 'research'));

create table if not exists public.crypto_floor_notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  desk text,
  author text not null,
  kind text not null check (kind in ('lesson', 'observation', 'plan', 'change', 'strategy', 'briefing', 'meeting')),
  title text not null,
  body text not null default '',
  data jsonb,
  meeting_id uuid
);
create index if not exists crypto_floor_notes_created_idx on public.crypto_floor_notes (created_at desc);
create index if not exists crypto_floor_notes_desk_idx on public.crypto_floor_notes (desk, created_at desc);
alter table public.crypto_floor_notes enable row level security;
revoke all on public.crypto_floor_notes from anon, authenticated;

create table if not exists public.crypto_floor_meetings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  desk text,
  kind text not null check (kind in ('team', 'allhands')),
  status text not null default 'running' check (status in ('running', 'done', 'failed')),
  trigger text,
  model text,
  summary text,
  actions jsonb not null default '[]'::jsonb,
  ended_at timestamptz,
  error text
);
create index if not exists crypto_floor_meetings_created_idx on public.crypto_floor_meetings (created_at desc);
alter table public.crypto_floor_meetings enable row level security;
revoke all on public.crypto_floor_meetings from anon, authenticated;

update public.crypto_floor_params set max_open_positions_total = 12 where id = 1 and max_open_positions_total = 8;

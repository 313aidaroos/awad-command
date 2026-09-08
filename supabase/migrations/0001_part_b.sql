-- AWAD COMMAND schema on the shared Contraxis/Apixis project.
-- Already applied on myfclypikkcvfurkbzmj — this file is the docs copy.

create schema if not exists awad_command;

create table if not exists awad_command.projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  slug text unique not null,
  name text not null,
  status text not null,
  accent text,
  config jsonb not null default '{}'::jsonb
);

create table if not exists awad_command.agents (
  id text primary key,
  created_at timestamptz not null default now(),
  project_slug text not null references awad_command.projects (slug),
  name text not null,
  role text,
  objective text,
  tools text[] not null default '{}',
  status text not null default 'idle',
  current_task text,
  stats jsonb not null default '{}'::jsonb,
  active_since timestamptz
);

create table if not exists awad_command.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agent_id text not null references awad_command.agents (id),
  title text not null,
  status text not null default 'queued',
  started_at timestamptz,
  completed_at timestamptz,
  result jsonb
);

create table if not exists awad_command.events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  ts timestamptz not null default now(),
  type text not null,
  project_slug text,
  agent_id text,
  node_id text,
  flow_id text,
  flow_stage_id text,
  flow_instance_id text,
  summary text not null,
  payload jsonb,
  source text not null default 'live'
);

create table if not exists awad_command.metrics_daily (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_slug text not null,
  day date not null,
  metrics jsonb not null default '{}'::jsonb,
  unique (project_slug, day)
);

create table if not exists awad_command.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_slug text not null,
  status text,
  value numeric,
  payload jsonb
);

create table if not exists awad_command.sales (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_slug text not null,
  amount numeric not null,
  currency text not null default 'usd',
  payload jsonb
);

create table if not exists awad_command.customers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_slug text not null,
  external_id text,
  payload jsonb
);

create table if not exists awad_command.transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_slug text not null,
  amount numeric not null,
  kind text not null,
  payload jsonb
);

create table if not exists awad_command.expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_slug text not null,
  amount numeric not null,
  category text,
  payload jsonb
);

create table if not exists awad_command.messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_slug text,
  channel text,
  subject text,
  from_addr text,
  importance int,
  payload jsonb
);

create table if not exists awad_command.lead_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_slug text not null,
  agent_id text,
  lead_name text,
  message text not null,
  status text not null default 'queued',
  payload jsonb
);

create table if not exists awad_command.deployments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_slug text not null,
  env text,
  status text,
  sha text,
  payload jsonb
);

create table if not exists awad_command.approvals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  description text,
  kind text not null,
  risk text not null,
  status text not null default 'pending',
  requested_by text,
  resolved_by text,
  resolved_at timestamptz,
  payload jsonb
);

create table if not exists awad_command.system_status (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_slug text unique,
  status text not null,
  detail jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists events_ts_desc on awad_command.events (ts desc);
create index if not exists events_project_ts_desc on awad_command.events (project_slug, ts desc);

alter table awad_command.projects enable row level security;
alter table awad_command.agents enable row level security;
alter table awad_command.agent_tasks enable row level security;
alter table awad_command.events enable row level security;
alter table awad_command.metrics_daily enable row level security;
alter table awad_command.leads enable row level security;
alter table awad_command.sales enable row level security;
alter table awad_command.customers enable row level security;
alter table awad_command.transactions enable row level security;
alter table awad_command.expenses enable row level security;
alter table awad_command.messages enable row level security;
alter table awad_command.lead_messages enable row level security;
alter table awad_command.deployments enable row level security;
alter table awad_command.approvals enable row level security;
alter table awad_command.system_status enable row level security;

grant usage on schema awad_command to anon, authenticated, service_role;
grant select on all tables in schema awad_command to authenticated;
grant all on all tables in schema awad_command to service_role;

-- Clients must set db.schema = 'awad_command'.
-- Auth remains on the shared project's public auth schema.

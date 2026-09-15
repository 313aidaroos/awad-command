-- Part C: task loop on the shared Contraxis/Apixis project (schema awad_command).
--
-- Live hub (myfclypikkcvfurkbzmj) already has awad_command.approvals
-- (id, project_slug, action, status, payload, created_at, decided_at) plus
-- command_events / profiles / app_settings. It does NOT have agent_tasks.
-- 0001_part_b.sql is a docs copy and was not applied there.
--
-- This migration:
--   * does not recreate approvals
--   * adds COMMAND title/kind/risk columns onto the existing approvals table
--   * creates missing 0001-shaped tables (projects, agents, agent_tasks, events, …)
--   * adds lease/result/report/budget columns and approval_id on agent_tasks
--   * creates read-only whitelist views for the worker supabase.query tool

create schema if not exists awad_command;

-- ---------------------------------------------------------------------------
-- Supporting tables (no-op when 0001 was applied locally)
-- ---------------------------------------------------------------------------

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
  memory jsonb not null default '{}'::jsonb,
  active_since timestamptz
);

create table if not exists awad_command.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agent_id text not null references awad_command.agents (id),
  title text not null,
  instruction text,
  status text not null default 'queued',
  source text not null default 'human',
  created_by text,
  started_at timestamptz,
  completed_at timestamptz,
  result jsonb,
  error text,
  report text,
  lease_until timestamptz,
  worker_id text,
  claimed_at timestamptz,
  budget_usd numeric not null default 0.5,
  spent_usd numeric not null default 0,
  approval_id uuid
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

create table if not exists awad_command.metrics_daily (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_slug text not null,
  day date not null,
  metrics jsonb not null default '{}'::jsonb,
  unique (project_slug, day)
);

create table if not exists awad_command.system_status (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_slug text unique,
  status text not null,
  detail jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Extend agent_tasks when 0001 already created the slim version
-- ---------------------------------------------------------------------------

alter table awad_command.agent_tasks add column if not exists instruction text;
alter table awad_command.agent_tasks add column if not exists source text;
alter table awad_command.agent_tasks add column if not exists created_by text;
alter table awad_command.agent_tasks add column if not exists error text;
alter table awad_command.agent_tasks add column if not exists report text;
alter table awad_command.agent_tasks add column if not exists lease_until timestamptz;
alter table awad_command.agent_tasks add column if not exists worker_id text;
alter table awad_command.agent_tasks add column if not exists claimed_at timestamptz;
alter table awad_command.agent_tasks add column if not exists budget_usd numeric;
alter table awad_command.agent_tasks add column if not exists spent_usd numeric;
alter table awad_command.agent_tasks add column if not exists approval_id uuid;
alter table awad_command.agents add column if not exists memory jsonb;

update awad_command.agent_tasks set source = 'human' where source is null;
update awad_command.agent_tasks set budget_usd = 0.5 where budget_usd is null;
update awad_command.agent_tasks set spent_usd = 0 where spent_usd is null;
update awad_command.agents set memory = '{}'::jsonb where memory is null;

alter table awad_command.agent_tasks alter column source set default 'human';
alter table awad_command.agent_tasks alter column budget_usd set default 0.5;
alter table awad_command.agent_tasks alter column spent_usd set default 0;

-- ---------------------------------------------------------------------------
-- Extend the EXISTING live approvals table (do not create a second one).
-- 0001-shaped approvals already have title/kind/risk; live hub has
-- project_slug/action/decided_at instead. Add whichever side is missing.
-- ---------------------------------------------------------------------------

alter table awad_command.approvals add column if not exists title text;
alter table awad_command.approvals add column if not exists description text;
alter table awad_command.approvals add column if not exists kind text;
alter table awad_command.approvals add column if not exists risk text;
alter table awad_command.approvals add column if not exists requested_by text;
alter table awad_command.approvals add column if not exists resolved_by text;
alter table awad_command.approvals add column if not exists resolved_at timestamptz;
alter table awad_command.approvals add column if not exists project_slug text;
alter table awad_command.approvals add column if not exists action text;
alter table awad_command.approvals add column if not exists decided_at timestamptz;

update awad_command.approvals
set title = coalesce(nullif(title, ''), action)
where title is null and action is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agent_tasks_approval_id_fkey'
      and conrelid = 'awad_command.agent_tasks'::regclass
  ) then
    alter table awad_command.agent_tasks
      add constraint agent_tasks_approval_id_fkey
      foreign key (approval_id) references awad_command.approvals (id);
  end if;
end $$;

create index if not exists agent_tasks_status_created_idx
  on awad_command.agent_tasks (status, created_at);
create index if not exists agent_tasks_lease_idx
  on awad_command.agent_tasks (lease_until)
  where status in ('claimed', 'running');
create index if not exists agent_tasks_approval_idx
  on awad_command.agent_tasks (approval_id);
create index if not exists events_ts_desc on awad_command.events (ts desc);
create index if not exists events_project_ts_desc on awad_command.events (project_slug, ts desc);

-- ---------------------------------------------------------------------------
-- Worker read whitelist
-- ---------------------------------------------------------------------------

create or replace view awad_command.v_leads
with (security_invoker = true) as
select id, created_at, project_slug, status, value, payload
from awad_command.leads;

create or replace view awad_command.v_sales
with (security_invoker = true) as
select id, created_at, project_slug, amount, currency, payload
from awad_command.sales;

create or replace view awad_command.v_events
with (security_invoker = true) as
select id, created_at, ts, type, project_slug, agent_id, summary, payload, source
from awad_command.events;

create or replace view awad_command.v_metrics
with (security_invoker = true) as
select id, created_at, project_slug, day, metrics
from awad_command.metrics_daily;

-- ---------------------------------------------------------------------------
-- Atomic claim: reclaim expired leases, then lock one queued row.
-- Project round-robin via p_prefer_not_project (last project this worker ran).
-- ---------------------------------------------------------------------------

create or replace function awad_command.claim_queued_task(
  p_worker_id text,
  p_prefer_not_project text default null
)
returns setof awad_command.agent_tasks
language plpgsql
as $$
declare
  v_id uuid;
begin
  update awad_command.agent_tasks
  set
    status = 'queued',
    worker_id = null,
    claimed_at = null,
    lease_until = null
  where status in ('claimed', 'running')
    and lease_until is not null
    and lease_until < now();

  select t.id into v_id
  from awad_command.agent_tasks t
  left join awad_command.agents a on a.id = t.agent_id
  where t.status = 'queued'
  order by
    case
      when p_prefer_not_project is not null and a.project_slug = p_prefer_not_project then 1
      else 0
    end,
    t.created_at asc
  limit 1
  for update of t skip locked;

  if v_id is null then
    return;
  end if;

  return query
  update awad_command.agent_tasks
  set
    status = 'claimed',
    worker_id = p_worker_id,
    claimed_at = now(),
    lease_until = now() + interval '10 minutes'
  where id = v_id
  returning *;
end;
$$;

revoke all on function awad_command.claim_queued_task(text, text) from public, anon, authenticated;
grant execute on function awad_command.claim_queued_task(text, text) to service_role;

-- ---------------------------------------------------------------------------
-- RLS / grants — match live hub: operator select via is_allowed_operator()
-- Writes stay with service_role (worker + server actions).
-- ---------------------------------------------------------------------------

alter table awad_command.projects enable row level security;
alter table awad_command.agents enable row level security;
alter table awad_command.agent_tasks enable row level security;
alter table awad_command.events enable row level security;
alter table awad_command.leads enable row level security;
alter table awad_command.sales enable row level security;
alter table awad_command.metrics_daily enable row level security;
alter table awad_command.system_status enable row level security;

grant usage on schema awad_command to anon, authenticated, service_role;
grant select on awad_command.projects, awad_command.agents, awad_command.agent_tasks,
  awad_command.events, awad_command.leads, awad_command.sales, awad_command.metrics_daily,
  awad_command.system_status, awad_command.v_leads, awad_command.v_sales,
  awad_command.v_events, awad_command.v_metrics to authenticated;
grant all on awad_command.projects, awad_command.agents, awad_command.agent_tasks,
  awad_command.events, awad_command.leads, awad_command.sales, awad_command.metrics_daily,
  awad_command.system_status to service_role;
grant select on awad_command.v_leads, awad_command.v_sales, awad_command.v_events,
  awad_command.v_metrics to service_role;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'awad_command' and p.proname = 'is_allowed_operator'
  ) then
    execute $p$drop policy if exists projects_select_operator on awad_command.projects$p$;
    execute $p$create policy projects_select_operator on awad_command.projects for select to authenticated using (awad_command.is_allowed_operator())$p$;
    execute $p$drop policy if exists agents_select_operator on awad_command.agents$p$;
    execute $p$create policy agents_select_operator on awad_command.agents for select to authenticated using (awad_command.is_allowed_operator())$p$;
    execute $p$drop policy if exists agent_tasks_select_operator on awad_command.agent_tasks$p$;
    execute $p$create policy agent_tasks_select_operator on awad_command.agent_tasks for select to authenticated using (awad_command.is_allowed_operator())$p$;
    execute $p$drop policy if exists events_select_operator on awad_command.events$p$;
    execute $p$create policy events_select_operator on awad_command.events for select to authenticated using (awad_command.is_allowed_operator())$p$;
    execute $p$drop policy if exists leads_select_operator on awad_command.leads$p$;
    execute $p$create policy leads_select_operator on awad_command.leads for select to authenticated using (awad_command.is_allowed_operator())$p$;
    execute $p$drop policy if exists sales_select_operator on awad_command.sales$p$;
    execute $p$create policy sales_select_operator on awad_command.sales for select to authenticated using (awad_command.is_allowed_operator())$p$;
    execute $p$drop policy if exists metrics_daily_select_operator on awad_command.metrics_daily$p$;
    execute $p$create policy metrics_daily_select_operator on awad_command.metrics_daily for select to authenticated using (awad_command.is_allowed_operator())$p$;
    execute $p$drop policy if exists system_status_select_operator on awad_command.system_status$p$;
    execute $p$create policy system_status_select_operator on awad_command.system_status for select to authenticated using (awad_command.is_allowed_operator())$p$;
  end if;
end $$;

alter table awad_command.agent_tasks replica identity full;
alter table awad_command.approvals replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table awad_command.agent_tasks;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table awad_command.approvals;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

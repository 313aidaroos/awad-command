-- Part D: computer capability on tasks + agent-screens metadata.
-- Schema: awad_command (shared Contraxis / Apixis project).
-- Storage bucket `agent-screens` lives in storage.*, not this schema — see notes at bottom.

create schema if not exists awad_command;

alter table awad_command.agent_tasks
  add column if not exists capabilities text[] not null default '{}';

update awad_command.agent_tasks
set capabilities = '{}'
where capabilities is null;

create index if not exists agent_tasks_capabilities_idx
  on awad_command.agent_tasks
  using gin (capabilities);

create table if not exists awad_command.agent_screens (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_slug text not null,
  task_id uuid,
  worker_id text,
  storage_path text not null,
  screenshot_url text,
  source text not null default 'live'
);

create index if not exists agent_screens_project_created_idx
  on awad_command.agent_screens (project_slug, created_at desc);

alter table awad_command.agent_screens enable row level security;

grant select on awad_command.agent_screens to authenticated;
grant all on awad_command.agent_screens to service_role;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'awad_command' and p.proname = 'is_allowed_operator'
  ) then
    execute $p$drop policy if exists agent_screens_select_operator on awad_command.agent_screens$p$;
    execute $p$create policy agent_screens_select_operator on awad_command.agent_screens for select to authenticated using (awad_command.is_allowed_operator())$p$;
  end if;
end $$;

-- Replace the 0002 two-arg claim with a capabilities-aware version.
-- Task capabilities must be a subset of the worker's capabilities (`<@`).
-- Empty task.capabilities can be claimed by any worker.
drop function if exists awad_command.claim_queued_task(text, text);

create or replace function awad_command.claim_queued_task(
  p_worker_id text,
  p_prefer_not_project text default null,
  p_capabilities text[] default '{}'
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
    and coalesce(t.capabilities, '{}') <@ coalesce(p_capabilities, '{}')
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

revoke all on function awad_command.claim_queued_task(text, text, text[]) from public, anon, authenticated;
grant execute on function awad_command.claim_queued_task(text, text, text[]) to service_role;

-- Storage bucket (no-op when the Storage API schema is absent).
-- Private bucket: the worker uploads with the service role and returns a signed URL.
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'storage' and table_name = 'buckets'
  ) then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('agent-screens', 'agent-screens', false, 5242880, array['image/png', 'image/jpeg'])
    on conflict (id) do nothing;
  end if;
end $$;

-- Notes (not executed):
--   * Bucket name: agent-screens
--   * Object path: {project_slug}/{task_id}/{timestamp}.png
--   * Signed URLs land in awad_command.agent_screens.screenshot_url and events.payload.screenshot_url
--   * Dashboard fallback: Storage → New bucket → agent-screens → private

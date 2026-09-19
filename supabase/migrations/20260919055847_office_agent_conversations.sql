create table if not exists awad_command.office_turns (
 id uuid primary key,
 created_at timestamptz not null default now(),
 agent_id text not null,
 project_slug text not null,
 message text not null,
 reply text,
 status text not null default 'thinking' check(status in ('thinking','replied','failed'))
);
create index if not exists office_turns_agent_created on awad_command.office_turns(agent_id,created_at desc);
alter table awad_command.office_turns enable row level security;
revoke all on awad_command.office_turns from anon,authenticated;
grant select,insert,update on awad_command.office_turns to service_role;
create table if not exists awad_command.lead_messages (
 id text primary key,
 created_at timestamptz not null default now(),
 project_slug text not null,
 agent_id text,
 lead_name text,
 message text not null,
 status text not null default 'queued',
 payload jsonb
);
create index if not exists lead_messages_project_created on awad_command.lead_messages(project_slug,created_at desc);
alter table awad_command.lead_messages enable row level security;
revoke all on awad_command.lead_messages from anon,authenticated;
grant select,insert,update on awad_command.lead_messages to service_role;

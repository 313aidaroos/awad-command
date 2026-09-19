create table if not exists awad_command.boardroom_turns (
  id uuid primary key,
  created_at timestamptz not null default now(),
  message text not null,
  scope jsonb not null,
  participant_ids jsonb not null default '[]'::jsonb,
  participant_count integer not null check (participant_count > 0),
  response jsonb,
  status text not null default 'thinking' check (status in ('thinking','replied','failed'))
);

create index if not exists boardroom_turns_created
  on awad_command.boardroom_turns(created_at desc);

alter table awad_command.boardroom_turns enable row level security;
revoke all on awad_command.boardroom_turns from anon, authenticated;
grant select, insert, update on awad_command.boardroom_turns to service_role;

comment on table awad_command.boardroom_turns is
  'Owner-only AI-facilitated council conversations. Access only through authenticated server routes.';

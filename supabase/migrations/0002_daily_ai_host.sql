-- Daily AI Host production storage. Server routes use service_role; no direct client access.
create table if not exists awad_command.historical_events (
  id uuid primary key default gen_random_uuid(),
  normalized_key text not null unique,
  event_month smallint not null check (event_month between 1 and 12),
  event_day smallint not null check (event_day between 1 and 31),
  event_year integer not null,
  title text not null,
  summary text not null,
  category text,
  verified boolean not null default false,
  confidence numeric(4,3) not null default 0 check (confidence between 0 and 1),
  source_metadata jsonb not null default '[]'::jsonb,
  never_reuse boolean not null default false,
  allow_reuse boolean not null default false,
  favorite boolean not null default false,
  last_used_at timestamptz,
  usage_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists awad_command.words (
  id uuid primary key default gen_random_uuid(),
  normalized_key text not null unique,
  word text not null,
  pronunciation text not null,
  part_of_speech text not null,
  definition text not null,
  example_sentence text not null,
  difficulty text not null check (difficulty in ('accessible', 'intermediate', 'advanced')),
  category text,
  never_reuse boolean not null default false,
  allow_reuse boolean not null default false,
  favorite boolean not null default false,
  last_used_at timestamptz,
  usage_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists awad_command.quotes (
  id uuid primary key default gen_random_uuid(),
  normalized_key text not null unique,
  quote text not null,
  author text not null,
  source text not null,
  verified boolean not null default false,
  category text not null,
  never_reuse boolean not null default false,
  allow_reuse boolean not null default false,
  favorite boolean not null default false,
  last_used_at timestamptz,
  usage_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists awad_command.daily_episodes (
  id uuid primary key default gen_random_uuid(),
  episode_date date not null,
  version integer not null default 1 check (version > 0),
  idempotency_key text not null unique,
  calendar_month smallint not null check (calendar_month between 1 and 12),
  calendar_day smallint not null check (calendar_day between 1 and 31),
  historical_event_id text not null,
  historical_event_key text not null,
  historical_event_title text not null,
  historical_event_year integer not null,
  historical_event_summary text not null,
  historical_event_source_urls text[] not null default '{}',
  word text not null,
  word_key text not null,
  word_definition text not null,
  word_pronunciation text not null,
  word_part_of_speech text not null,
  word_example text not null,
  quote text not null,
  quote_key text not null,
  quote_author text not null,
  script text not null,
  script_version integer not null default 1,
  duration_target integer not null check (duration_target between 15 and 120),
  video_url text,
  thumbnail_url text,
  status text not null,
  generation_status text not null,
  qc_status text not null,
  publishing_status text not null,
  manual_or_automatic text not null check (manual_or_automatic in ('manual', 'automatic')),
  event_reuse_allowed boolean not null default false,
  word_reuse_allowed boolean not null default false,
  quote_reuse_allowed boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique (episode_date, version)
);

create unique index if not exists daily_episodes_event_no_duplicate
  on awad_command.daily_episodes (historical_event_key) where not event_reuse_allowed;
create unique index if not exists daily_episodes_word_no_duplicate
  on awad_command.daily_episodes (word_key) where not word_reuse_allowed;
create unique index if not exists daily_episodes_quote_no_duplicate
  on awad_command.daily_episodes (quote_key) where not quote_reuse_allowed;
create index if not exists daily_episodes_date_desc on awad_command.daily_episodes (episode_date desc, version desc);
create index if not exists daily_episodes_status on awad_command.daily_episodes (status);

create table if not exists awad_command.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid references awad_command.daily_episodes (id) on delete cascade,
  job_type text not null,
  status text not null check (status in ('pending', 'running', 'completed', 'failed', 'retrying', 'skipped')),
  provider text,
  attempt integer not null default 0,
  cost_usd numeric(12,4) not null default 0,
  started_at timestamptz,
  finished_at timestamptz,
  error text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists generation_jobs_episode on awad_command.generation_jobs (episode_id, created_at);

create table if not exists awad_command.social_posts (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references awad_command.daily_episodes (id) on delete cascade,
  platform text not null check (platform in ('youtube', 'tiktok', 'instagram', 'facebook', 'x')),
  status text not null,
  external_id text,
  external_url text,
  account_name text,
  caption text,
  last_error text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  published_at timestamptz
);
create index if not exists social_posts_episode on awad_command.social_posts (episode_id, platform);

create table if not exists awad_command.daily_host_settings (
  id uuid primary key default gen_random_uuid(),
  singleton_key text not null unique default 'default',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists awad_command.daily_host_sources (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid references awad_command.daily_episodes (id) on delete cascade,
  historical_event_key text,
  source_title text not null,
  source_url text not null,
  publisher text not null,
  confidence numeric(4,3) not null default 0,
  verified boolean not null default false,
  license text,
  created_at timestamptz not null default now(),
  unique (episode_id, source_url)
);

create table if not exists awad_command.daily_host_analytics (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references awad_command.daily_episodes (id) on delete cascade,
  platform text not null,
  measured_at timestamptz not null default now(),
  views bigint not null default 0,
  likes bigint not null default 0,
  comments bigint not null default 0,
  shares bigint not null default 0,
  average_watch_seconds numeric(10,2) not null default 0,
  completion_rate numeric(5,4) not null default 0,
  follower_growth integer not null default 0,
  sample_data boolean not null default false,
  payload jsonb not null default '{}'::jsonb
);
create index if not exists daily_host_analytics_episode on awad_command.daily_host_analytics (episode_id, measured_at desc);

create table if not exists awad_command.avatar_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  avatar_provider text,
  avatar_id text,
  voice_provider text,
  voice_id text,
  reference_photo_path text,
  reference_video_path text,
  reference_audio_path text,
  status text not null default 'not_configured',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists awad_command.automation_runs (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid references awad_command.daily_episodes (id) on delete set null,
  automation_key text not null unique,
  trigger_source text not null check (trigger_source in ('manual', 'cron')),
  status text not null,
  step text not null,
  provider text,
  retry integer not null default 0,
  cost_usd numeric(12,4) not null default 0,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  payload jsonb not null default '{}'::jsonb
);
create index if not exists automation_runs_started on awad_command.automation_runs (started_at desc);

alter table awad_command.historical_events enable row level security;
alter table awad_command.words enable row level security;
alter table awad_command.quotes enable row level security;
alter table awad_command.daily_episodes enable row level security;
alter table awad_command.generation_jobs enable row level security;
alter table awad_command.social_posts enable row level security;
alter table awad_command.daily_host_settings enable row level security;
alter table awad_command.daily_host_sources enable row level security;
alter table awad_command.daily_host_analytics enable row level security;
alter table awad_command.avatar_profiles enable row level security;
alter table awad_command.automation_runs enable row level security;

revoke all on all tables in schema awad_command from anon;
grant all on awad_command.historical_events, awad_command.words, awad_command.quotes,
  awad_command.daily_episodes, awad_command.generation_jobs, awad_command.social_posts,
  awad_command.daily_host_settings, awad_command.daily_host_sources,
  awad_command.daily_host_analytics, awad_command.avatar_profiles,
  awad_command.automation_runs to service_role;

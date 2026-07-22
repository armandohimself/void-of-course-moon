create extension if not exists pgcrypto;

create table if not exists host_config (
  id integer primary key default 1,
  timezone text not null,
  availability_rules jsonb not null default '{}'::jsonb,
  meeting_duration_minutes integer not null default 30,
  body_set text not null default 'modern' check (body_set in ('modern', 'traditional')),
  encrypted_google_refresh_token text,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint host_config_singleton check (id = 1)
);

insert into host_config (id, timezone, availability_rules, meeting_duration_minutes, body_set)
values (
  1,
  'America/New_York',
  '{"1":[{"start":"09:00","end":"17:00"}],"2":[{"start":"09:00","end":"17:00"}],"3":[{"start":"09:00","end":"17:00"}],"4":[{"start":"09:00","end":"17:00"}],"5":[{"start":"09:00","end":"17:00"}]}'::jsonb,
  30,
  'modern'
)
on conflict (id) do nothing;

create table if not exists voc_windows (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  body_set text not null check (body_set in ('modern', 'traditional')),
  computed_at timestamptz not null default timezone('utc', now()),
  constraint voc_windows_non_empty check (ends_at > starts_at),
  constraint voc_windows_unique unique (body_set, starts_at, ends_at)
);

create index if not exists voc_windows_lookup_idx on voc_windows (body_set, starts_at, ends_at);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  visitor_name text not null,
  visitor_email text not null,
  google_event_id text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint bookings_non_empty check (ends_at > starts_at),
  constraint bookings_unique_slot unique (starts_at)
);

create index if not exists bookings_lookup_idx on bookings (starts_at, ends_at);

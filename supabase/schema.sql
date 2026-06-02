create extension if not exists pgcrypto;

create table if not exists public.value_items (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.value_settings (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.trade_ads (
  id uuid primary key default gen_random_uuid(),
  offering text not null default '',
  offering_items jsonb not null default '[]'::jsonb,
  wants text not null default '',
  wants_items jsonb not null default '[]'::jsonb,
  notes text not null default '',
  poster jsonb not null,
  poster_discord_id text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);

alter table public.trade_ads add column if not exists poster_discord_id text;
alter table public.trade_ads add column if not exists expires_at timestamptz not null default now() + interval '24 hours';

create index if not exists trade_ads_created_at_idx on public.trade_ads (created_at desc);
create index if not exists trade_ads_active_idx on public.trade_ads (expires_at desc, created_at desc);
create index if not exists trade_ads_poster_active_idx on public.trade_ads (poster_discord_id, expires_at);

create table if not exists public.trade_post_limits (
  key text primary key,
  count integer not null default 0,
  reset_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists trade_post_limits_reset_at_idx on public.trade_post_limits (reset_at);

create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  actor jsonb not null,
  changes jsonb not null default '[]'::jsonb,
  summary text not null,
  target_id text,
  target_name text,
  target_type text not null,
  created_at timestamptz not null default now()
);

create index if not exists admin_logs_created_at_idx on public.admin_logs (created_at desc);

alter table public.value_items enable row level security;
alter table public.value_settings enable row level security;
alter table public.trade_ads enable row level security;
alter table public.admin_logs enable row level security;
alter table public.trade_post_limits enable row level security;

drop policy if exists deny_direct_api_access on public.value_items;
drop policy if exists deny_direct_api_access on public.value_settings;
drop policy if exists deny_direct_api_access on public.trade_ads;
drop policy if exists deny_direct_api_access on public.trade_post_limits;
drop policy if exists deny_direct_api_access on public.admin_logs;

create policy deny_direct_api_access on public.value_items
  for all to anon, authenticated
  using (false)
  with check (false);

create policy deny_direct_api_access on public.value_settings
  for all to anon, authenticated
  using (false)
  with check (false);

create policy deny_direct_api_access on public.trade_ads
  for all to anon, authenticated
  using (false)
  with check (false);

create policy deny_direct_api_access on public.trade_post_limits
  for all to anon, authenticated
  using (false)
  with check (false);

create policy deny_direct_api_access on public.admin_logs
  for all to anon, authenticated
  using (false)
  with check (false);

revoke usage on schema public from anon, authenticated;
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public;

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke execute on functions from public;

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
  created_at timestamptz not null default now()
);

create index if not exists trade_ads_created_at_idx on public.trade_ads (created_at desc);

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

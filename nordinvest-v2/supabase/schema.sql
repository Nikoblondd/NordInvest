-- NordInvest v2 — Supabase schema
-- Run in Supabase → SQL Editor. Safe to re-run (idempotent-ish).

-- ── profiles ────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  phone text,
  linkedin_url text unique,
  device_fingerprint text,
  signup_ip inet,
  created_at timestamptz default now(),

  -- subscription
  subscription_tier text default 'free'
    check (subscription_tier in ('free','starter','plus','pro','unlimited')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status text,
  current_period_end timestamptz,

  -- usage
  analyses_used_this_month integer default 0,
  analyses_reset_at timestamptz default now() + interval '1 month'
);

-- ensure phone exists if the table predates this column
alter table public.profiles add column if not exists phone text;

-- ensure the tier check allows 'plus' (added after initial launch)
alter table public.profiles drop constraint if exists profiles_subscription_tier_check;
alter table public.profiles add constraint profiles_subscription_tier_check
  check (subscription_tier in ('free','starter','plus','pro','unlimited'));

-- ── analyses ────────────────────────────────────────────────
create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  property_url text,
  property_data jsonb,
  strategy text check (strategy in ('cashflow','appreciation','value_add')),
  analysis_result jsonb,
  investment_score integer,
  verdict text,
  created_at timestamptz default now(),
  saved_to_portfolio boolean default false
);

-- ── watches (Fase 4 — "Vagt") ───────────────────────────────
-- A saved listing the tool monitors: it re-scrapes the ad on a schedule,
-- re-runs the analysis when the price moves, and flags when a deal turns
-- interesting. Every price snapshot is real longitudinal market data that
-- feeds the brain over time.
create table if not exists public.watches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  analysis_id uuid references public.analyses(id) on delete set null,
  listing_url text not null,
  address text,
  strategy text,
  inputs jsonb,                 -- snapshot of the analysis inputs (to re-score on price change)
  baseline_price bigint,
  baseline_score integer,
  current_price bigint,
  current_score integer,
  status text default 'active'
    check (status in ('active','price_drop','price_rise','sold','error')),
  price_history jsonb default '[]'::jsonb,   -- [{ "d": "2026-08-31", "price": 15495000, "score": 5 }]
  has_alert boolean default false,
  last_alert text,
  created_at timestamptz default now(),
  last_checked_at timestamptz
);

alter table public.watches enable row level security;
alter table public.watches add column if not exists inputs jsonb;

-- ── Row Level Security ──────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.analyses enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own analyses" on public.analyses;
create policy "own analyses" on public.analyses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own watches" on public.watches;
create policy "own watches" on public.watches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists watches_active_idx on public.watches (last_checked_at)
  where status <> 'sold';

-- ── Auto-create a profile row on signup ─────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;

  -- add the phone column if an older schema is already deployed
  -- (safe no-op otherwise)
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

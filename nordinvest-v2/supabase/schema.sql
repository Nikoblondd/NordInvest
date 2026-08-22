-- NordInvest v2 — Supabase schema
-- Run in Supabase → SQL Editor. Safe to re-run (idempotent-ish).

-- ── profiles ────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  linkedin_url text unique,
  device_fingerprint text,
  signup_ip inet,
  created_at timestamptz default now(),

  -- subscription
  subscription_tier text default 'free'
    check (subscription_tier in ('free','starter','pro','unlimited')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status text,
  current_period_end timestamptz,

  -- usage
  analyses_used_this_month integer default 0,
  analyses_reset_at timestamptz default now() + interval '1 month'
);

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

-- ── Row Level Security ──────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.analyses enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own analyses" on public.analyses;
create policy "own analyses" on public.analyses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Auto-create a profile row on signup ─────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- NordInvest — Fase 4 "Vagt": monitored-listings table.
-- Kør denne i Supabase → SQL Editor (den er idempotent, sikker at køre igen).

create table if not exists public.watches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  analysis_id uuid references public.analyses(id) on delete set null,
  listing_url text not null,
  address text,
  strategy text,
  inputs jsonb,
  baseline_price bigint,
  baseline_score integer,
  current_price bigint,
  current_score integer,
  status text default 'active'
    check (status in ('active','price_drop','price_rise','sold','error')),
  price_history jsonb default '[]'::jsonb,
  has_alert boolean default false,
  last_alert text,
  created_at timestamptz default now(),
  last_checked_at timestamptz
);

alter table public.watches add column if not exists inputs jsonb;
alter table public.watches enable row level security;

drop policy if exists "own watches" on public.watches;
create policy "own watches" on public.watches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists watches_active_idx on public.watches (last_checked_at)
  where status <> 'sold';

-- Make the new table visible to the REST API immediately.
notify pgrst, 'reload schema';

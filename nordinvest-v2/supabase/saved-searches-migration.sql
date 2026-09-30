-- NordInvest — "Vagt på søgning": saved deal-searches that alert on new matches.
-- Kør i Supabase → SQL Editor (idempotent, sikker at køre igen).

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  label text,
  market text default 'bolig' check (market in ('bolig','investering')),
  municipality text,
  type text,
  price_min bigint,
  price_max bigint,
  min_score integer default 60,
  sort text default 'score',
  seen_ids jsonb default '[]'::jsonb,   -- listing ids already surfaced (to detect NEW ones)
  new_count integer default 0,
  last_match jsonb,                     -- summary of the latest new match, for the dashboard
  created_at timestamptz default now(),
  last_checked_at timestamptz
);

alter table public.saved_searches enable row level security;

drop policy if exists "own searches" on public.saved_searches;
create policy "own searches" on public.saved_searches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists saved_searches_check_idx on public.saved_searches (last_checked_at);

notify pgrst, 'reload schema';

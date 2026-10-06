-- NordInvest Udlejerindeks: one official reading per month (the 1st), so the
-- public page can show the change since last month.
-- Kør i Supabase → SQL Editor (idempotent, sikker at køre igen).

create table if not exists public.udlejerindeks_maalinger (
  month text primary key,          -- 'YYYY-MM'
  rows jsonb not null,             -- [{slug, rank, share, positive, scanned}]
  scanned integer,
  positive integer,
  created_at timestamptz default now()
);

-- Service role only: no public policies.
alter table public.udlejerindeks_maalinger enable row level security;

notify pgrst, 'reload schema';

-- NordInvest — "Månedens bedste køb i <by>": monthly city email for visitors
-- without an account. Double opt-in; consent wording and time are stored.
-- Kør i Supabase → SQL Editor (idempotent, sikker at køre igen).

create table if not exists public.deal_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  kommune text not null,                 -- kommune slug, e.g. 'viborg'
  consent_text text not null,            -- the exact wording they ticked
  consent_at timestamptz not null,       -- when they ticked it
  confirmed_at timestamptz,              -- when they clicked the link in the confirm email
  unsubscribed_at timestamptz,
  last_sent text,                        -- 'YYYY-MM' of the last monthly email
  created_at timestamptz default now(),
  unique (email, kommune)
);

-- Service role only: no public policies.
alter table public.deal_subscribers enable row level security;

create index if not exists deal_subscribers_active_idx on public.deal_subscribers (kommune) where confirmed_at is not null and unsubscribed_at is null;

notify pgrst, 'reload schema';

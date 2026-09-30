-- NordInvest market dataset — the durable, always-fresh index of the whole
-- Danish for-sale market (residential + commercial/investment) that the local
-- agent keeps up to date. One row per listing, deduped across sweeps.
--
-- Run this once in the Supabase SQL editor. The agent writes with the SERVICE
-- ROLE key (bypasses RLS); the app can read it later. Only needed for DB mode —
-- the agent also works with a local JSON store and no database at all.

create table if not exists public.market_listings (
  id            text primary key,          -- "<source>:<external_id>"
  source        text not null,             -- boligsiden | ejendomstorvet
  market        text not null,             -- bolig | investering
  external_id   text not null,
  url           text,
  address       text,
  road          text,
  zip           integer,
  city          text,
  municipality  text,                      -- boligsiden slug (e.g. "aalborg") for area filtering
  region        text,                      -- province code (DK011…) for investment area filtering
  type          text,                      -- condo/villa/... | subcategory
  subcategory   text,
  price         bigint,
  area          numeric,
  rooms         integer,
  year_built    integer,
  energy_label  text,
  return_percent numeric,                  -- investment: stated afkast
  operating_cost bigint,                   -- investment: yearly opex
  image         text,
  lat           numeric,
  lon           numeric,
  content_hash  text,                      -- change detection (non-price fields)
  status        text default 'active',     -- active | price_changed | gone
  price_history jsonb default '[]'::jsonb,  -- [{ d: 'YYYY-MM-DD', price }]
  first_seen    timestamptz default now(),
  last_seen     timestamptz default now(),
  updated_at    timestamptz default now()
);

-- If you already created the table before these columns existed, run just this:
alter table public.market_listings add column if not exists municipality text;
alter table public.market_listings add column if not exists region text;

create index if not exists market_listings_market_idx  on public.market_listings (market);
create index if not exists market_listings_muni_idx    on public.market_listings (municipality);
create index if not exists market_listings_status_idx  on public.market_listings (status);
create index if not exists market_listings_zip_idx     on public.market_listings (zip);
create index if not exists market_listings_seen_idx    on public.market_listings (last_seen);
create index if not exists market_listings_price_idx   on public.market_listings (price);

-- Lightweight health/heartbeat log so you can see the agent is alive and how each
-- sweep went (one row per sweep). Optional but handy.
create table if not exists public.agent_runs (
  id          uuid primary key default gen_random_uuid(),
  started_at  timestamptz default now(),
  finished_at timestamptz,
  ok          boolean,
  seen        integer,      -- listings seen this sweep
  new_count   integer,
  changed     integer,
  gone        integer,
  errors      jsonb,        -- per-portal error/drift notes
  note        text
);

alter table public.market_listings enable row level security;
alter table public.agent_runs      enable row level security;
-- No public policies: only the service role (the agent, and server routes) can
-- touch these. Add a read policy later if the app should read them client-side.

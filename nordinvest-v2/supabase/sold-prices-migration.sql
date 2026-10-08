-- Tinglyste salgspriser (Ejerfortegnelsen) joined with NordInvest's own listing
-- history on the BFE number. Written by the market agent (agent/ejf.mjs) from
-- the Mac whose IP is registered on the Datafordeler IT-system; read by the
-- site to show realised prices and the discount from asking to sale.
create table if not exists public.sold_prices (
  bfe           bigint not null,
  sale_date     date,
  zip           integer,
  type          text,
  area          numeric,
  sale_price    bigint not null,
  transfer      text,          -- overdragelsesmåde (fri handel, familie, …)
  last_asking   bigint,
  first_asking  bigint,
  discount_pct  numeric,       -- (last asking − sale) / last asking, %
  price_m2      integer,
  created_at    timestamptz default now(),
  primary key (bfe, sale_date)
);
create index if not exists sold_prices_zip_type on public.sold_prices (zip, type);
alter table public.sold_prices enable row level security;
-- No public policies: only the service role (agent and server) reads and writes.

"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Loader2, Search, TrendingUp, MapPin, Sparkles, ArrowUpRight, Info, Home, Building2, Bell, Check, SlidersHorizontal, ChevronDown, X, Map as MapIcon, LayoutGrid } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { num, kr } from "@/lib/analysis";
import { createClient } from "@/lib/supabase/client";
import type { AnalyzedDeal, InvestmentDeal } from "@/lib/deals";
import { MUNICIPALITIES } from "@/lib/kommuner";
import type { MapPoint } from "./DealMap";

// Leaflet touches `window`, so the map is client-only (no SSR).
const DealMap = dynamic(() => import("./DealMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[600px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
      <Loader2 className="animate-spin" />
    </div>
  ),
});

// Searchable MULTI-select kommune picker — type "f" → Frederiksberg, Frederikssund,
// Faxe…; pick several, each shown as a removable chip. All 98 kommuner, alphabetical.
// Popular municipalities for one-tap selection (the big cities most people want).
const POPULAR = ["koebenhavn", "aarhus", "odense", "aalborg", "esbjerg", "vejle", "randers", "kolding", "horsens", "roskilde"];

function CityPicker({ values, onChange }: { values: string[]; onChange: (slugs: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ql = q.trim().toLowerCase();
  const list = ql ? MUNICIPALITIES.filter((m) => m.name.toLowerCase().includes(ql)) : MUNICIPALITIES;
  const sorted = ql
    ? [...list].sort((a, b) => Number(b.name.toLowerCase().startsWith(ql)) - Number(a.name.toLowerCase().startsWith(ql)))
    : list;
  const toggle = (slug: string) =>
    onChange(values.includes(slug) ? values.filter((s) => s !== slug) : [...values, slug]);
  const nameOf = (slug: string) => MUNICIPALITIES.find((m) => m.slug === slug)?.name ?? slug;

  return (
    <div className="relative">
      <div
        className="mt-1 flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-1.5 focus-within:border-blue-500"
        onClick={() => setOpen(true)}
      >
        {values.length === 0 && !q && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
            🇩🇰 Hele Danmark
          </span>
        )}
        {values.map((slug) => (
          <span key={slug} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 py-1 pl-2 pr-1 text-xs font-semibold text-blue-700">
            {nameOf(slug)}
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); toggle(slug); }}
              className="flex h-4 w-4 items-center justify-center rounded text-blue-400 hover:bg-blue-100 hover:text-blue-700"
              aria-label={`Fjern ${nameOf(slug)}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={q}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={values.length === 0 ? "Søg kommune, eller lad stå tom for hele landet…" : "Tilføj flere…"}
          className="min-w-[130px] flex-1 bg-transparent px-1 py-1 text-sm font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
        />
      </div>
      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {!ql && (
            <>
              {/* Hele Danmark = clear all */}
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onChange([]); setOpen(false); }}
                className="flex w-full items-center justify-between border-b border-slate-100 px-3 py-2.5 text-left text-sm hover:bg-slate-50"
              >
                <span className="font-semibold text-slate-900">🇩🇰 Hele Danmark <span className="font-normal text-slate-400">· søg i alle kommuner</span></span>
                {values.length === 0 && <Check size={15} className="text-blue-600" />}
              </button>
              {/* Popular quick-picks */}
              <div className="border-b border-slate-100 px-3 py-2.5">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Populære</div>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR.map((slug) => {
                    const on = values.includes(slug);
                    return (
                      <button
                        key={slug}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); toggle(slug); }}
                        className={clsx(
                          "rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
                          on ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                        )}
                      >
                        {on && "✓ "}{nameOf(slug)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
          <ul className="max-h-56 overflow-auto py-1">
            {sorted.length === 0 && <li className="px-3 py-2 text-sm text-slate-400">Ingen kommuner fundet</li>}
            {sorted.map((m) => {
              const on = values.includes(m.slug);
              return (
                <li key={m.slug}>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); toggle(m.slug); setQ(""); }}
                    className={clsx(
                      "flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50",
                      on ? "font-semibold text-blue-600" : "text-slate-700",
                    )}
                  >
                    {m.name}
                    {on && <Check size={15} className="text-blue-600" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

const TYPES = [
  { id: "condo", label: "Ejerlejlighed" },
  { id: "villa", label: "Villa" },
  // Boligsiden's filter expects the space-form value; "terraced" returns HTTP 400.
  { id: "terraced house", label: "Rækkehus" },
  { id: "cooperative", label: "Andelsbolig" },
];

const SORTS = [
  { id: "score", label: "Bedste score" },
  { id: "priceDesc", label: "Pris: høj → lav" },
  { id: "priceAsc", label: "Pris: lav → høj" },
  { id: "cashflowDesc", label: "Cashflow: høj → lav" },
  { id: "cashflowAsc", label: "Cashflow: lav → høj" },
  { id: "yieldDesc", label: "Afkast: høj → lav" },
  { id: "yieldAsc", label: "Afkast: lav → høj" },
  { id: "areaDesc", label: "Areal: størst først" },
  { id: "areaAsc", label: "Areal: mindst først" },
];

const SUBCATS = ["Boligudlejning", "Kontor", "Detailhandel & butik", "Lager & produktion", "Hotel & restaurant", "Andre typer", "Grunde"];
const ENERGY_LEVELS = ["A", "B", "C", "D", "E", "F", "G"];

// A compact labelled input for the advanced-filter grid.
function Adv({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
const advInput = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 tnum";

const dk = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString("da-DK") : "–");

// Carry the reliable Boligsiden numbers straight into the analyzer, and pass the
// agent URL so it can still fetch photos for the AI condition analysis. This
// avoids depending on each agent's page structure for the core figures.
function dealHref(d: AnalyzedDeal, dp: string, ir: string): string {
  const q = new URLSearchParams();
  q.set("url", d.url);
  q.set("price", String(d.price));
  if (d.area) q.set("area", String(d.area));
  if (d.rooms) q.set("rooms", String(d.rooms));
  // Pass the EXACT operating cost the card was scored with — when the listing
  // has no ejerudgift, analyzeDeal estimates it from the area. Omitting it made
  // the analyzer fall back to its generic default, so cash flow and score
  // dropped on click-through. Must mirror analyzeDeal()'s formula exactly.
  const opex = d.monthlyExpense ?? (d.area ? Math.round((d.area * 35) / 50) * 50 : 0);
  q.set("opex", String(opex));
  q.set("rent", String(d.estRent));
  // Carry the SAME financing assumptions the card was scored with, so the full
  // analysis reproduces the exact cash flow / score — no jump on click-through.
  q.set("downPaymentPct", dp);
  q.set("interestRate", ir);
  if (d.address) q.set("addr", d.address);
  if (d.yearBuilt) q.set("year", String(d.yearBuilt));
  return `/analyseren?${q.toString()}`;
}

function ScorePill({ score }: { score: number }) {
  const tone = score >= 65 ? "text-emerald-600" : score >= 45 ? "text-blue-600" : "text-slate-400";
  return (
    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white">
      <span className={clsx("text-sm font-bold leading-none tnum", tone)}>{score}</span>
      <span className="mt-0.5 text-[8px] font-medium uppercase tracking-wide text-slate-400">score</span>
    </div>
  );
}

function DealCard({ d, dp, ir }: { d: AnalyzedDeal; dp: string; ir: string }) {
  const cfTone = d.cashFlow >= 0 ? "text-emerald-600" : "text-rose-500";
  // Whole card is a link — click/tap anywhere (image, text, the "Fuld analyse"
  // pill) opens the analysis. The inner CTA is now a styled <span> that only
  // exists to signal the primary action; the real navigation belongs to the
  // outer Link so screen readers get a single, meaningful target.
  return (
    <Link
      href={dealHref(d, dp, ir)}
      aria-label={`Åbn analyse: ${d.road || d.address}, ${d.zip} ${d.city}`}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        {d.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.image} alt={d.address} loading="lazy" draggable={false} onError={(e) => { e.currentTarget.style.display = "none"; }} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300"><MapPin size={28} /></div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur">
          {d.source}
        </span>
        {d.priceChangePct != null && d.priceChangePct < 0 && (
          <span className="absolute right-3 top-3 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
            {num(d.priceChangePct, 0)} %
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-slate-900">{d.road}</div>
            <div className="truncate text-xs text-slate-400">{d.zip} {d.city}</div>
          </div>
          <ScorePill score={d.score} />
        </div>

        <div className="mt-3 text-lg font-bold text-slate-900 tnum">{kr(d.price)}</div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
          {d.area && <span>{d.area} m²</span>}
          {d.rooms && <span>· {d.rooms} vær.</span>}
          {d.yearBuilt && <span>· {d.yearBuilt}</span>}
          {d.energyLabel && <span>· {d.energyLabel}</span>}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
          <div>
            <div className={clsx("text-sm font-bold tnum", cfTone)}>{dk(d.cashFlow)}</div>
            <div className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-400">cashflow/md</div>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 tnum">{num(d.capRate)}%</div>
            <div className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-400">afkast</div>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 tnum">{dk(d.estRent)}</div>
            <div className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-400">est. leje</div>
          </div>
        </div>

        <span
          aria-hidden
          className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors group-hover:bg-slate-800 group-active:translate-y-px"
        >
          Fuld analyse <ArrowUpRight size={15} />
        </span>
      </div>
    </Link>
  );
}

function investHref(d: InvestmentDeal, dp: string, ir: string): string {
  const q = new URLSearchParams();
  q.set("url", d.url);
  q.set("price", String(d.price));
  if (d.area) q.set("area", String(d.area));
  q.set("rent", String(Math.round(d.noi / 12))); // NOI/md as the (net) rent baseline
  q.set("opex", "0"); // NOI is already net — don't double-count operating costs
  // Same financing assumptions the card was scored with (investment defaults to
  // 30 % down) so the full analysis matches the card exactly.
  q.set("downPaymentPct", dp);
  q.set("interestRate", ir);
  q.set("market", "investering");
  if (d.subcategory) q.set("subcat", d.subcategory);
  if (d.address) q.set("addr", d.address);
  return `/analyseren?${q.toString()}`;
}

function InvestmentCard({ d, dp, ir }: { d: InvestmentDeal; dp: string; ir: string }) {
  const cfTone = d.cashFlow >= 0 ? "text-emerald-600" : "text-rose-500";
  // Whole card is a link — click/tap anywhere opens the analysis on both
  // phones and desktop. Same accessibility contract as the residential card.
  return (
    <Link
      href={investHref(d, dp, ir)}
      aria-label={`Åbn analyse: ${d.road || d.title}, ${d.zip} ${d.city}`}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        {d.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.image} alt={d.address} loading="lazy" draggable={false} onError={(e) => { e.currentTarget.style.display = "none"; }} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300"><Building2 size={28} /></div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur">
          {d.source}
        </span>
        {d.subcategory && (
          <span className="absolute right-3 top-3 rounded-full bg-slate-900/85 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
            {d.subcategory}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-slate-900">{d.road || d.title}</div>
            <div className="truncate text-xs text-slate-400">{d.zip} {d.city}</div>
          </div>
          <ScorePill score={d.score} />
        </div>

        <div className="mt-3 text-lg font-bold text-slate-900 tnum">{kr(d.price)}</div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-slate-400">
          {d.area && <span>{d.area} m²</span>}
          {d.energyLabel && <span>· {d.energyLabel}</span>}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
          <div>
            <div className={clsx("text-sm font-bold tnum", cfTone)}>{dk(d.cashFlow)}</div>
            <div className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-400">cashflow/md</div>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 tnum">{num(d.capRate)}%</div>
            <div className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-400">afkast</div>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 tnum">{dk(Math.round(d.noi / 12))}</div>
            <div className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-400">leje/md</div>
          </div>
        </div>

        {d.note && <p className="mt-3 text-[11px] leading-snug text-slate-400">{d.note}</p>}

        <span
          aria-hidden
          className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors group-hover:bg-slate-800 group-active:translate-y-px"
        >
          Fuld analyse <ArrowUpRight size={15} />
        </span>
      </div>
    </Link>
  );
}

export function DealFinder() {
  const [market, setMarket] = useState<"bolig" | "investering">("bolig");
  const [cities, setCities] = useState<string[]>([]); // empty = hele Danmark
  const [type, setType] = useState("condo");
  const [sort, setSort] = useState("score");
  const [priceMax, setPriceMax] = useState<number | "">(4000000);
  const [strategy] = useState("cashflow");
  const [loading, setLoading] = useState(false);
  const [deals, setDeals] = useState<(AnalyzedDeal | InvestmentDeal)[] | null>(null);
  const [meta, setMeta] = useState<{ scanned: number; rentFactor: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [resultView, setResultView] = useState<"liste" | "kort">("liste");
  const [mapState, setMapState] = useState<{ status: "idle" | "loading" | "done" | "error"; points: MapPoint[] }>({ status: "idle", points: [] });
  type Criteria = { market: string; cities: string[]; type: string; sort: string; priceMax: number | "" };
  const [criteria, setCriteria] = useState<Criteria | null>(null);
  const [advOpen, setAdvOpen] = useState(false);
  const [adv, setAdv] = useState<Record<string, string>>({
    priceMin: "", areaMin: "", minYield: "", minCashflow: "", minScore: "",
    downPayment: "", interest: "", roomsMin: "", yearFrom: "", energy: "", minDscr: "", subcat: "",
  });
  const setA = (k: string, v: string) => setAdv((p) => ({ ...p, [k]: v }));
  const advCount = Object.values(adv).filter((v) => v !== "").length;

  // Save the current criteria as a standing search — the "Vagt på søgning" cron
  // then emails the user when a NEW listing matches.
  const saveSearch = async () => {
    const supabase = createClient();
    if (!supabase) { window.location.href = "/auth/signup?next=/deals"; return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/auth/signup?next=/deals"; return; }
    setSaved("saving");
    const names = cities.map((s) => MUNICIPALITIES.find((c) => c.slug === s)?.name ?? s);
    const cityLabel = names.length === 0 ? "Hele Danmark" : names.length <= 2 ? names.join(" + ") : `${names[0]} +${names.length - 1}`;
    const typeLabel = market === "investering" ? "Erhverv" : (TYPES.find((t) => t.id === type)?.label ?? "");
    const priceLabel = priceMax ? ` ≤ ${(Number(priceMax) / 1_000_000).toLocaleString("da-DK", { maximumFractionDigits: 1 })} mio.` : "";
    const label = `${cityLabel} · ${typeLabel}${priceLabel}`;
    // Baseline: everything currently matching is "already seen", so the user is
    // only alerted about listings that appear AFTER they save — never spammed
    // with the results they're looking at right now.
    const seen = (deals ?? []).map((d) => String(d.id)).slice(0, 300);
    const { error } = await supabase.from("saved_searches").insert({
      user_id: user.id, label, market, municipality: cities.join(","), type,
      price_max: priceMax || null, min_score: 60, sort, seen_ids: seen,
    });
    setSaved(error ? "error" : "done");
  };

  const switchMarket = (m: "bolig" | "investering") => {
    if (m === market) return;
    setMarket(m);
    setDeals(null);
    setErr(null);
    setPriceMax(m === "investering" ? 20000000 : 4000000);
  };

  // Shared query builder — used by both the list search and the map fetch, so
  // the map shows exactly the same filtered set as the list.
  const buildParams = (c: Criteria): URLSearchParams => {
    const q = new URLSearchParams({ market: c.market, municipality: c.cities.join(","), type: c.type, sort: c.sort, strategy });
    // No kommune selected = search the whole country.
    if (c.cities.length === 0) q.set("all", "1");
    if (c.priceMax) q.set("priceMax", String(c.priceMax));
    const map: [string, string][] = [
      ["priceMin", "priceMin"], ["areaMin", "areaMin"], ["minYield", "minYield"],
      ["minCashflow", "minCashflow"], ["minScore", "minScore"],
      ["downPayment", "downPaymentPct"], ["interest", "interestRate"],
    ];
    for (const [k, key] of map) if (adv[k] !== "") q.set(key, adv[k]);
    if (c.market === "bolig") {
      if (adv.roomsMin !== "") q.set("roomsMin", adv.roomsMin);
      if (adv.yearFrom !== "") q.set("yearFrom", adv.yearFrom);
      if (adv.energy !== "") q.set("energy", adv.energy);
    } else {
      if (adv.minDscr !== "") q.set("minDscr", adv.minDscr);
      if (adv.subcat !== "") q.set("subcat", adv.subcat);
    }
    return q;
  };

  const doSearch = async (c: Criteria) => {
    setLoading(true);
    setErr(null);
    setSaved("idle");
    setCriteria(c);
    setResultView("liste");
    setMapState({ status: "idle", points: [] }); // a new search invalidates the old map
    try {
      const res = await fetch(`/api/deals/search?${buildParams(c).toString()}`);
      const data = await res.json();
      if (!data.ok) { setErr("Kunne ikke søge lige nu. Prøv igen."); setDeals([]); }
      else { setDeals(data.deals); setMeta({ scanned: data.scanned, rentFactor: data.rentFactor ?? 1 }); }
    } catch {
      setErr("Netværksfejl. Prøv igen.");
      setDeals([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch the FULL filtered set (with coordinates) for the map — lazily, only
  // when the user opens the Kort view. `nationwide` shows the whole country
  // without a kommune search.
  const loadMap = async (c: Criteria, opts?: { nationwide?: boolean }) => {
    setMapState({ status: "loading", points: [] });
    try {
      const q = buildParams(c);
      q.set("limit", "2500");
      if (opts?.nationwide) {
        q.set("all", "1");
        q.delete("municipality");
        q.delete("priceMax");
        q.set("limit", "3500");
        // Whole market = every residential type, not just the selected one.
        if (c.market !== "investering") q.set("type", "all");
      }
      const res = await fetch(`/api/deals/search?${q.toString()}`);
      const data = await res.json();
      const raw: (AnalyzedDeal | InvestmentDeal)[] = data.ok ? data.deals : [];
      const invest = c.market === "investering";
      const points: MapPoint[] = raw
        .filter((d) => Number.isFinite(d.lat as number) && Number.isFinite(d.lon as number))
        .map((d) => ({
          id: String(d.id),
          lat: d.lat as number,
          lon: d.lon as number,
          price: d.price,
          cashFlow: d.cashFlow,
          score: d.score,
          capRate: d.capRate,
          image: d.image ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          title: (d as any).road || (d as any).title || (d as any).address || "Ejendom",
          city: d.city,
          href: invest ? investHref(d as InvestmentDeal, effDp, effIr) : dealHref(d as AnalyzedDeal, effDp, effIr),
        }));
      setMapState({ status: "done", points });
    } catch {
      setMapState({ status: "error", points: [] });
    }
  };

  const openMap = () => {
    setResultView("kort");
    if (mapState.status === "loading" || mapState.status === "done") return;
    if (criteria) loadMap(criteria);
    else loadMap({ market, cities: [], type, sort, priceMax: "" }, { nationwide: true });
  };

  // Standalone "open the whole-market map" entry — works without a search.
  const openNationwideMap = () => {
    setCriteria(null);
    setResultView("kort");
    setMapState({ status: "idle", points: [] });
    loadMap({ market, cities: [], type, sort, priceMax: "" }, { nationwide: true });
  };

  // The financing assumptions the CARDS were scored with — must mirror the
  // /api/deals/search route defaults exactly (investment 30 % down, bolig 20 %,
  // 5 % interest) so the click-through analysis reproduces the same numbers.
  const effDp = adv.downPayment !== "" ? adv.downPayment : market === "investering" ? "30" : "20";
  const effIr = adv.interest !== "" ? adv.interest : "5";

  const run = () => doSearch({ market, cities, type, sort, priceMax });

  // Auto-run a saved search opened from the dashboard (/deals?…&run=1).
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("run") !== "1") return;
    const m = (sp.get("market") as "bolig" | "investering") || "bolig";
    const cs = (sp.get("municipality") || "koebenhavn").split(",").map((s) => s.trim()).filter(Boolean);
    const ty = sp.get("type") || "condo";
    const so = sp.get("sort") || "score";
    const pm = sp.get("priceMax") ? Number(sp.get("priceMax")) : m === "investering" ? 20000000 : 4000000;
    setMarket(m); setCities(cs); setType(ty); setSort(so); setPriceMax(pm);
    doSearch({ market: m, cities: cs, type: ty, sort: so, priceMax: pm });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {/* market toggle */}
      <div className="mb-4 inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
        <button onClick={() => switchMarket("bolig")}
          className={clsx("flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
            market === "bolig" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900")}>
          <Home size={15} /> Boliger
        </button>
        <button onClick={() => switchMarket("investering")}
          className={clsx("flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
            market === "investering" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900")}>
          <Building2 size={15} /> Erhvervsejendomme
        </button>
      </div>

      {/* search bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-5">
        <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_1fr_auto] md:items-end">
          <label className="block">
            <span className="text-xs font-medium text-slate-500">By / kommune</span>
            <CityPicker values={cities} onChange={setCities} />
          </label>
          {market === "bolig" ? (
            <label className="block">
              <span className="text-xs font-medium text-slate-500">Type</span>
              <select value={type} onChange={(e) => setType(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500">
                {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </label>
          ) : (
            <div className="hidden md:block" />
          )}
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Maks. pris</span>
            <input type="number" value={priceMax} step={250000} onChange={(e) => setPriceMax(e.target.value ? Number(e.target.value) : "")}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 tnum" />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Sortér efter</span>
            <select value={sort} onChange={(e) => {
                const so = e.target.value;
                setSort(so);
                // Sorting is server-side over the full pool, so re-run the search
                // immediately (if one exists) — the change takes effect at once.
                if (deals !== null) doSearch({ market, cities, type, sort: so, priceMax });
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500">
              {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <button onClick={run} disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-btn ring-1 ring-inset ring-white/10 transition-colors hover:bg-blue-700 disabled:opacity-60">
            {loading ? <Loader2 size={17} className="animate-spin" /> : <Search size={17} />}
            Find handler
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <Info size={13} />
            {market === "investering"
              ? "Erhvervsejendomme fra Ejendomstorvet — cash flow og afkast beregnet ud fra det udbudte afkast og prisen."
              : "Leje og cash flow er estimater — klik “Fuld analyse” for den præcise vurdering med BBR-data og fotos."}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={openNationwideMap}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50">
              <MapIcon size={13} /> Se hele markedet på kort
            </button>
            <button onClick={() => setAdvOpen((v) => !v)}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50">
              <SlidersHorizontal size={13} /> Avancerede filtre
              {advCount > 0 && <span className="rounded-full bg-blue-100 px-1.5 text-[10px] font-bold text-blue-700">{advCount}</span>}
              <ChevronDown size={13} className={clsx("transition-transform", advOpen && "rotate-180")} />
            </button>
          </div>
        </div>

        {advOpen && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <Adv label="Min. pris (kr)"><input type="number" step={100000} value={adv.priceMin} onChange={(e) => setA("priceMin", e.target.value)} placeholder="0" className={advInput} /></Adv>
              <Adv label="Min. areal (m²)"><input type="number" step={5} value={adv.areaMin} onChange={(e) => setA("areaMin", e.target.value)} placeholder="—" className={advInput} /></Adv>
              <Adv label="Min. afkast (%)"><input type="number" step={0.5} value={adv.minYield} onChange={(e) => setA("minYield", e.target.value)} placeholder="—" className={advInput} /></Adv>
              <Adv label="Min. cashflow (kr/md.)"><input type="number" step={500} value={adv.minCashflow} onChange={(e) => setA("minCashflow", e.target.value)} placeholder="—" className={advInput} /></Adv>
              <Adv label="Min. score"><input type="number" step={5} min={0} max={100} value={adv.minScore} onChange={(e) => setA("minScore", e.target.value)} placeholder="—" className={advInput} /></Adv>
              <Adv label="Udbetaling (%)"><input type="number" step={5} value={adv.downPayment} onChange={(e) => setA("downPayment", e.target.value)} placeholder={market === "investering" ? "30" : "20"} className={advInput} /></Adv>
              <Adv label="Rente (%)"><input type="number" step={0.25} value={adv.interest} onChange={(e) => setA("interest", e.target.value)} placeholder="5" className={advInput} /></Adv>

              {market === "bolig" ? (
                <>
                  <Adv label="Min. værelser"><input type="number" step={1} value={adv.roomsMin} onChange={(e) => setA("roomsMin", e.target.value)} placeholder="—" className={advInput} /></Adv>
                  <Adv label="Byggeår fra"><input type="number" step={1} value={adv.yearFrom} onChange={(e) => setA("yearFrom", e.target.value)} placeholder="—" className={advInput} /></Adv>
                  <Adv label="Energimærke mindst">
                    <select value={adv.energy.split(",").pop() || ""} onChange={(e) => setA("energy", e.target.value ? ENERGY_LEVELS.slice(0, ENERGY_LEVELS.indexOf(e.target.value) + 1).join(",") : "")} className={advInput}>
                      <option value="">Alle</option>
                      {ENERGY_LEVELS.map((l) => <option key={l} value={l}>{l} eller bedre</option>)}
                    </select>
                  </Adv>
                </>
              ) : (
                <>
                  <Adv label="Min. gældsdækning (DSCR)"><input type="number" step={0.05} value={adv.minDscr} onChange={(e) => setA("minDscr", e.target.value)} placeholder="—" className={advInput} /></Adv>
                  <Adv label="Ejendomstype">
                    <select value={adv.subcat} onChange={(e) => setA("subcat", e.target.value)} className={advInput}>
                      <option value="">Alle typer</option>
                      {SUBCATS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Adv>
                </>
              )}
            </div>
            {advCount > 0 && (
              <button onClick={() => setAdv({ priceMin: "", areaMin: "", minYield: "", minCashflow: "", minScore: "", downPayment: "", interest: "", roomsMin: "", yearFrom: "", energy: "", minDscr: "", subcat: "" })}
                className="mt-3 text-xs font-medium text-slate-400 hover:text-slate-700">Nulstil filtre</button>
            )}
          </div>
        )}
      </div>

      {/* results */}
      <div className="mt-6">
        {loading && (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center">
            <Loader2 size={26} className="animate-spin text-blue-600" />
            <p className="mt-3 text-sm text-slate-500">Scanner markedet på tværs af mæglere og analyserer hver bolig…</p>
          </div>
        )}

        {!loading && err && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-800">{err}</div>
        )}

        {(resultView === "kort" || (!loading && deals && deals.length > 0)) && (
          <>
            {/* Header row: on phones the count sits above the toggles so
                nothing overflows and both rows stay comfortably tappable. */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-900">
                {resultView === "kort" ? (
                  <>
                    <MapIcon size={16} className="shrink-0 text-blue-500" />
                    <span className="truncate">
                      {mapState.points.length > 0 ? `${mapState.points.length} ejendomme på kortet` : "Kort over markedet"}
                      {!criteria && <span className="font-normal text-slate-400"> · hele Danmark</span>}
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingUp size={16} className="shrink-0 text-emerald-500" />
                    <span className="truncate">
                      {deals?.length ?? 0} bedste handler
                      {meta && <span className="font-normal text-slate-400"> · {meta.scanned} boliger scannet</span>}
                    </span>
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* Liste / Kort toggle */}
                <div className="flex rounded-full border border-slate-200 bg-white p-0.5">
                  <button
                    onClick={() => setResultView("liste")}
                    className={clsx("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                      resultView === "liste" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900")}
                  >
                    <LayoutGrid size={13} /> Liste
                  </button>
                  <button
                    onClick={openMap}
                    className={clsx("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                      resultView === "kort" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900")}
                  >
                    <MapIcon size={13} /> Kort
                  </button>
                </div>
                {meta && meta.rentFactor !== 1 && (
                  <span className="hidden items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 sm:flex">
                    <Sparkles size={12} /> Kalibreret leje ×{num(meta.rentFactor, 2)}
                  </span>
                )}
                {saved === "done" ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                    <Check size={14} /> Søgning gemt
                  </span>
                ) : (
                  <button onClick={saveSearch} disabled={saved === "saving"}
                    className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60">
                    {saved === "saving" ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}
                    Gem søgning
                  </button>
                )}
              </div>
            </div>
            {resultView === "liste" ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {market === "investering"
                  ? (deals as InvestmentDeal[]).map((d) => <InvestmentCard key={d.id} d={d} dp={effDp} ir={effIr} />)
                  : (deals as AnalyzedDeal[]).map((d) => <DealCard key={d.id} d={d} dp={effDp} ir={effIr} />)}
              </div>
            ) : mapState.status === "loading" ? (
              <div className="flex h-[600px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
                <Loader2 className="animate-spin" /> <span className="ml-2 text-sm">Henter kortet…</span>
              </div>
            ) : mapState.status === "error" ? (
              <div className="flex h-[600px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                Kunne ikke hente kortet. Prøv igen.
              </div>
            ) : mapState.points.length === 0 ? (
              <div className="flex h-[600px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                Ingen ejendomme med kortdata lige nu.
              </div>
            ) : (
              <>
                <p className="mb-3 text-xs text-slate-400">
                  {mapState.points.length} ejendomme på kortet — klik på en markør for at se pris, cashflow og score. Tallene i cirklerne viser, hvor mange ejendomme der er samlet på ét område (zoom ind for at dele dem op).
                </p>
                <DealMap points={mapState.points} />
              </>
            )}
          </>
        )}

        {resultView === "liste" && !loading && deals && deals.length === 0 && !err && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
            Ingen boliger fundet med de kriterier. Prøv en anden by, type eller en højere maks. pris.
          </div>
        )}

        {!loading && !deals && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Search size={26} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">Vælg by og kriterier, og tryk <b>Find handler</b> — så scanner vi hele markedet og rangerer de bedste investeringer for dig.</p>
          </div>
        )}
      </div>
    </div>
  );
}

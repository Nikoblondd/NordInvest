"use client";
/* eslint-disable @next/next/no-img-element -- listing photos come from the portals' own image CDN */

import { useEffect, useMemo, useRef, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ArrowLeft, ArrowRight, Bell, Building2, Check, ChevronDown, ExternalLink, FileText, Heart, Loader2, MapPinned, Share2, X } from "lucide-react";
import type { Basis, BuyerHome } from "@/lib/buyer/market";
import { TYPE_LABEL } from "@/lib/buyer/market";
import type { Plan } from "@/lib/buyer/plans";
import type { MarketRates } from "@/lib/market-rates";
import type { Dossier } from "@/lib/dossier";
import type { FutureBurdens } from "@/lib/future-burdens";
import type { AreaNews } from "@/lib/buyer/news";
import { STAGES, type Household, type SavedHome } from "@/lib/buyer/state";
import { INSTITUTES, capacity, defaultOwnerCost, equityPath, financing, yearlyBidrag } from "@/lib/buyer/finance";
import { VERDICT_COLOR } from "./BuyerMap";
import { kr, mio, pct, useImages, VerdictPill } from "./ui";

/*
 * A home, two ways. The peek sits in the side panel when a dot is tapped:
 * the photo, the price, the verdict in one sentence, follow it, and one clear
 * button to the whole home. The full view puts everything on one page as
 * tiles: the price against the area, what it costs a month, whether you can
 * borrow for it, the cheapest loan, friværdi, the area, building projects,
 * the facts and the local news. Short sentences, numbers first.
 */

type Detail = {
  home: BuyerHome;
  listing: { image: string | null; url: string | null; history: { d: string; price: number }[] };
  basis: Basis;
  similar: BuyerHome[];
  area: { zip: number; homes: number; sameKind: number; medianPpm: number | null; cutShare: number | null; newLast30: number; goodShare: number | null };
  trend: { growth: number | null; yoy: number | null; region: string };
  rates: MarketRates | null;
  plans: (Plan & { kind: string })[];
};

/** The verdict as one plain sentence. */
export function verdictLine(h: BuyerHome): string {
  if (h.suspect) return "Prisen ligger så skævt, at annoncen nok har en fejl. Tjek areal og boligtype.";
  const d = Math.round(Math.abs(h.deltaPct));
  if (d < 2) return "Prisen ligger lige på niveau med lignende boliger i nærheden.";
  return h.deltaPct < 0 ? `${d} % billigere end lignende boliger i nærheden.` : `${d} % dyrere end lignende boliger i nærheden.`;
}

/* ───────────────────────── Follow: save, stage, mail, note ───────────────────────── */

export function Follow({ home, saved, onToggleSave, onUpdate, compact }: { home: BuyerHome; saved?: SavedHome; onToggleSave: () => void; onUpdate: (s: SavedHome) => void; compact?: boolean }) {
  const [note, setNote] = useState(saved?.note ?? "");
  useEffect(() => setNote(saved?.note ?? ""), [saved?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!saved) {
    return (
      <button type="button" onClick={onToggleSave} className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border border-slate-300 bg-white text-[15px] font-semibold text-slate-900 hover:border-rose-300 hover:text-rose-600">
        <Heart size={18} /> Gem og følg boligen
      </button>
    );
  }
  const diff = home.price - saved.price;
  return (
    <div className="rounded-2xl bg-rose-50/60 p-4 ring-1 ring-rose-100">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-rose-700"><Heart size={17} fill="currentColor" /> Du følger boligen</p>
        <button type="button" onClick={onToggleSave} className="text-[13px] font-medium text-slate-500 hover:text-slate-800">Fjern</button>
      </div>
      {diff !== 0 && <p className={`mt-1 text-[14px] font-medium ${diff < 0 ? "text-emerald-700" : "text-slate-600"}`}>{diff < 0 ? `Sat ned ${kr(-diff)}` : `Steget ${kr(diff)}`} siden du gemte den</p>}
      <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Hvor er du med boligen?">
        {STAGES.map((s) => (
          <button key={s.id} type="button" role="radio" aria-checked={saved.stage === s.id} onClick={() => onUpdate({ ...saved, stage: saved.stage === s.id ? undefined : s.id })}
            className={`min-h-[36px] rounded-full px-3 text-[13px] font-semibold transition-colors ${saved.stage === s.id ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-slate-300"}`}>{s.label}</button>
        ))}
      </div>
      <label className="mt-3 flex min-h-[40px] cursor-pointer items-center gap-2.5 text-[14px] text-slate-700">
        <input type="checkbox" checked={saved.alert} onChange={(e) => onUpdate({ ...saved, alert: e.target.checked })} className="h-4 w-4 accent-blue-600" />
        <Bell size={15} className="text-slate-400" /> Mail mig ved prisfald, og når den bliver solgt
      </label>
      {!compact && (
        <textarea value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== (saved.note ?? "") && onUpdate({ ...saved, note })} rows={2} placeholder="Dine noter, fx fra fremvisningen"
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[15px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
      )}
    </div>
  );
}

/* ───────────────────────── Peek: the side panel ───────────────────────── */

export function HomePeek({ home, saved, onToggleSave, onUpdate, onOpen, onClose }: { home: BuyerHome; saved?: SavedHome; onToggleSave: () => void; onUpdate: (s: SavedHome) => void; onOpen: () => void; onClose: () => void }) {
  const images = useImages([home.id]);
  const img = images.get(home.id);
  const expected = Math.round((home.expPpm * home.area) / 10000) * 10000;
  return (
    <div className="h-full overflow-y-auto overscroll-contain bg-white">
      <div className="relative aspect-[16/10] w-full bg-slate-100">
        {img ? <img src={img} alt={`Billede af ${home.address}`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-300"><Building2 size={36} /></div>}
        <button type="button" onClick={onClose} aria-label="Tilbage til listen" className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow"><X size={18} /></button>
        {home.cutPct > 0 && <span className="absolute bottom-3 left-3 rounded-lg bg-emerald-600 px-2 py-1 text-[12px] font-semibold text-white">Sat ned {pct(home.cutPct)}</span>}
      </div>
      <div className="p-5">
        <p className="text-[28px] font-semibold tabular-nums tracking-[-0.02em]">{kr(home.price)}</p>
        <p className="mt-0.5 text-[15px] text-slate-700">{home.address}</p>

        <div className="mt-4 rounded-2xl p-4" style={{ background: `${VERDICT_COLOR[home.verdict]}12` }}>
          <VerdictPill v={home.verdict} large />
          <p className="mt-2 text-[16px] font-medium leading-snug text-slate-900">{verdictLine(home)}</p>
          {!home.suspect && expected > 0 && <p className="mt-1 text-[14px] text-slate-600">Områdets pris for den: ca. {mio(expected)}</p>}
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[["Størrelse", `${home.area} m²`], ["Værelser", home.rooms ? String(home.rooms) : "–"], ["Byggeår", home.year ? String(home.year) : "–"], ["Pris pr. m²", kr(home.ppm)], ["Type", TYPE_LABEL[home.type] ?? "Bolig"], ["Energi", home.energy ?? "–"]].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-slate-50 px-2 py-2.5"><dt className="text-[11px] font-medium text-slate-500">{k}</dt><dd className="mt-0.5 truncate text-[14px] font-semibold text-slate-900">{v}</dd></div>
          ))}
        </dl>

        <button type="button" onClick={onOpen} className="mt-5 flex min-h-[54px] w-full items-center justify-center gap-2 rounded-full bg-blue-600 text-[16px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(37,99,235,0.7)] hover:bg-blue-500">
          Se hele boligen <ArrowRight size={18} />
        </button>
        <p className="mt-2 text-center text-[13px] text-slate-500">Lån, friværdi, området og byggeprojekter på én side</p>

        <div className="mt-5"><Follow home={home} saved={saved} onToggleSave={onToggleSave} onUpdate={onUpdate} compact /></div>
      </div>
    </div>
  );
}

/* ───────────────────────── Full: everything on one page ───────────────────────── */

type FullProps = {
  home: BuyerHome;
  saved?: SavedHome;
  household: Household;
  onHousehold: (h: Household) => void;
  onToggleSave: () => void;
  onUpdate: (s: SavedHome) => void;
  onClose: () => void;
  onSelect: (id: string) => void;
  onShowPlans: () => void;
  kommuneName: string | null;
};

const Tile = ({ title, children, className = "", right }: { title: string; children: React.ReactNode; className?: string; right?: React.ReactNode }) => (
  <section className={`min-w-0 rounded-3xl bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-22px_rgba(15,23,42,0.25)] ring-1 ring-slate-200/70 ${className}`}>
    <div className="flex items-baseline justify-between gap-3"><h2 className="text-[15px] font-semibold text-slate-500">{title}</h2>{right}</div>
    <div className="mt-3">{children}</div>
  </section>
);
const Big = ({ children, tone }: { children: React.ReactNode; tone?: "pos" | "neg" }) => <p className={`text-[30px] font-semibold leading-none tabular-nums tracking-[-0.02em] ${tone === "pos" ? "text-emerald-700" : tone === "neg" ? "text-rose-700" : "text-slate-900"}`}>{children}</p>;
const Skel = ({ h = 90 }: { h?: number }) => <div className="animate-pulse rounded-2xl bg-slate-100" style={{ height: h }} />;

export function HomeDetail({ home, saved, household, onHousehold, onToggleSave, onUpdate, onClose, onSelect, onShowPlans, kommuneName }: FullProps) {
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState(false);
  const [dos, setDos] = useState<{ dossier: Dossier | null; burdens: FutureBurdens | null } | "loading" | null>("loading");
  const scroller = useRef<HTMLDivElement>(null);
  const images = useImages([home.id]);

  useEffect(() => {
    let live = true;
    setD(null); setErr(false); setDos("loading");
    scroller.current?.scrollTo({ top: 0 });
    fetch(`/api/boligkoeb/home?id=${encodeURIComponent(home.id)}`).then((r) => r.json()).then((j) => { if (!live) return; if (j.ok) setD(j); else setErr(true); }).catch(() => live && setErr(true));
    fetch(`/api/boligkoeb/dossier?id=${encodeURIComponent(home.id)}`).then((r) => r.json()).then((j) => { if (live) setDos(j.ok ? { dossier: j.dossier, burdens: j.burdens } : null); }).catch(() => live && setDos(null));
    return () => { live = false; };
  }, [home.id]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [onClose]);

  const share = async () => {
    const url = `${location.origin}/boligkoeb?bolig=${encodeURIComponent(home.id)}`;
    try { if (navigator.share) await navigator.share({ title: home.address, url }); else { await navigator.clipboard.writeText(url); alert("Linket er kopieret."); } } catch { /* cancelled */ }
  };

  const img = d?.listing.image ?? images.get(home.id) ?? null;
  const expected = Math.round((home.expPpm * home.area) / 10000) * 10000;
  const hist = d?.listing.history ?? [];
  const firstPrice = hist.length ? hist[0].price : home.price;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#f4f6f9]">
      <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2.5 sm:px-5">
        <button type="button" onClick={onClose} className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-3 text-[15px] font-semibold text-slate-800 hover:bg-slate-100"><ArrowLeft size={18} /> <span className="hidden sm:inline">Tilbage til kortet</span></button>
        <p className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold sm:text-left">{home.address.split(",")[0]}</p>
        <button type="button" onClick={share} className="flex h-11 w-11 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100" aria-label="Del boligen"><Share2 size={18} /></button>
        <button type="button" onClick={onToggleSave} aria-pressed={!!saved} className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold ${saved ? "bg-rose-50 text-rose-600" : "bg-slate-900 text-white hover:bg-slate-800"}`}>
          <Heart size={17} fill={saved ? "currentColor" : "none"} /> {saved ? "Følger" : "Gem"}
        </button>
      </header>

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto grid max-w-[1180px] gap-4 px-3 py-4 sm:px-6 sm:py-6 lg:grid-cols-3">
          {/* Photo + the essentials */}
          <div className="min-w-0 overflow-hidden rounded-3xl bg-slate-200 lg:col-span-2">
            <div className="relative aspect-[16/10] w-full lg:aspect-auto lg:h-full lg:min-h-[380px]">
              {img ? <img src={img} alt={`Billede af ${home.address}`} className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center text-slate-400"><Building2 size={40} /></div>}
            </div>
          </div>
          <section className="min-w-0 rounded-3xl bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-22px_rgba(15,23,42,0.25)] ring-1 ring-slate-200/70 sm:p-6">
            <p className="text-[13px] font-medium text-slate-500">{TYPE_LABEL[home.type] ?? "Bolig"} · {home.area} m²{home.rooms ? ` · ${home.rooms} vær.` : ""}{home.year ? ` · ${home.year}` : ""}</p>
            <h1 className="mt-1 text-[20px] font-semibold leading-snug tracking-[-0.01em]">{home.address}</h1>
            <p className="mt-3 text-[34px] font-semibold leading-none tabular-nums tracking-[-0.025em]">{kr(home.price)}</p>
            {firstPrice > home.price && <p className="mt-2 text-[14px] font-medium text-emerald-700">Sat ned {kr(firstPrice - home.price)} siden {new Date(hist[0].d).toLocaleDateString("da-DK", { day: "numeric", month: "short" })}</p>}
            <div className="mt-4 rounded-2xl p-4" style={{ background: `${VERDICT_COLOR[home.verdict]}12` }}>
              <VerdictPill v={home.verdict} large />
              <p className="mt-2 text-[16px] font-medium leading-snug">{verdictLine(home)}</p>
              {d ? <RangeBar basis={d.basis} ppm={home.ppm} /> : <div className="mt-3"><Skel h={36} /></div>}
            </div>
            <div className="mt-4"><Follow home={home} saved={saved} onToggleSave={onToggleSave} onUpdate={onUpdate} /></div>
            {d?.listing.url && <a href={d.listing.url} target="_blank" rel="noopener" className="mt-3 flex min-h-[44px] items-center justify-center gap-1.5 text-[14px] font-semibold text-blue-700 hover:underline">Se annoncen hos mægleren <ExternalLink size={14} /></a>}
          </section>

          {err && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-[14px] text-rose-800 lg:col-span-3">Noget af boligens data kunne ikke hentes. Prøv igen om lidt.</p>}

          <Money home={home} d={d} household={household} onHousehold={onHousehold} />

          <EquityTile home={home} d={d} expected={expected} />

          <Tile title="Området">
            {!d ? <Skel h={150} /> : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Mini label="Priser seneste år" value={d.trend.yoy != null ? `${d.trend.yoy > 0 ? "+" : ""}${pct(d.trend.yoy)}` : "–"} tone={d.trend.yoy == null ? undefined : d.trend.yoy >= 0 ? "pos" : "neg"} />
                  <Mini label="Om året, 10 år" value={d.trend.growth != null ? `+${pct(d.trend.growth)}` : "–"} />
                  <Mini label="Til salg her" value={String(d.area.homes)} />
                  <Mini label="Sat ned i pris" value={d.area.cutShare != null ? `${d.area.cutShare} %` : "–"} />
                </div>
                <p className="mt-3 text-[14px] text-slate-600">{d.area.cutShare != null && d.area.cutShare >= 30 ? "Mange er sat ned. Du kan byde lavere her." : d.area.cutShare != null && d.area.cutShare <= 12 ? "Få er sat ned. Boligerne sælges tæt på prisen." : "Normalt marked. Der er plads til at forhandle lidt."}</p>
                <p className="mt-1 text-[12px] text-slate-400">Postnummer {home.zip} · {d.trend.region} · Danmarks Statistik</p>
              </>
            )}
          </Tile>

          <Tile title="Bygges der i nærheden?" className="lg:col-span-2" right={d && d.plans.length > 0 ? <button type="button" onClick={onShowPlans} className="inline-flex items-center gap-1 text-[14px] font-semibold text-violet-700 hover:underline"><MapPinned size={14} /> Vis på kortet</button> : undefined}>
            {!d ? <Skel h={120} /> : <Plans plans={d.plans} />}
          </Tile>

          <Tile title="Fakta om boligen">
            <Records dos={dos} price={home.price} energy={home.energy} />
          </Tile>

          {home.kommune && (
            <Tile title={`Nyt fra ${kommuneName ?? "kommunen"}`} className="lg:col-span-2"><News slug={home.kommune} name={kommuneName ?? home.kommune} /></Tile>
          )}

          {d && d.similar.length > 0 && (
            <Tile title="Lignende boliger i nærheden" className={home.kommune ? "" : "lg:col-span-3"}>
              <ul className="divide-y divide-slate-100">
                {d.similar.slice(0, 5).map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => onSelect(s.id)} className="flex min-h-[52px] w-full items-center gap-3 text-left hover:bg-slate-50">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: VERDICT_COLOR[s.verdict] }} />
                      <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-medium">{s.address.split(",")[0]}</span><span className="text-[12px] text-slate-500">{s.area} m² · {kr(s.ppm)}/m²</span></span>
                      <span className="text-[14px] font-semibold tabular-nums">{mio(s.price)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Tile>
          )}

          <details className="group rounded-3xl bg-white/60 px-5 py-4 text-[13px] text-slate-500 ring-1 ring-slate-200/70 lg:col-span-3">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 font-semibold text-slate-600">Hvordan regner vi? <ChevronDown size={14} className="transition-transform group-open:rotate-180" /></summary>
            <p className="mt-2 leading-relaxed">Prisen sammenlignes med {d?.basis.n ?? "lignende"} boliger af samme type og lignende størrelse til salg {d?.basis.level === "naer" ? d.basis.place : "i området"}. Det er udbudspriser, ikke salgspriser, og stand og udsigt er ikke med. Renten er Nationalbankens tal for nye boliglån, bidraget er fra realkreditinstitutternes prisblade 2026, prisudviklingen fra Danmarks Statistik og lokalplanerne fra Plandata.dk. Læs altid tilstandsrapporten, før du byder.</p>
          </details>
        </div>
      </div>
    </div>
  );
}

const Mini = ({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) => (
  <div className="rounded-2xl bg-slate-50 p-3"><p className="text-[12px] text-slate-500">{label}</p><p className={`mt-0.5 text-[19px] font-semibold tabular-nums ${tone === "pos" ? "text-emerald-700" : tone === "neg" ? "text-rose-700" : "text-slate-900"}`}>{value}</p></div>
);

/** Where this home's m² price sits among similar homes. */
function RangeBar({ basis, ppm }: { basis: Basis; ppm: number }) {
  if (!basis.n || !basis.median) return null;
  const lo = Math.min(basis.q1 * 0.75, ppm * 0.95), hi = Math.max(basis.q3 * 1.25, ppm * 1.05);
  const x = (v: number) => `${Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100))}%`;
  return (
    <div className="mt-4">
      <div className="relative h-2 rounded-full" style={{ background: `linear-gradient(90deg, ${VERDICT_COLOR.godt}66, ${VERDICT_COLOR.middel}66 50%, ${VERDICT_COLOR.dyrt}66)` }}>
        <div className="absolute -top-[7px] h-[22px] w-[22px] -translate-x-1/2 rounded-full border-[3px] border-white bg-slate-900 shadow-[0_2px_6px_rgba(15,23,42,0.35)]" style={{ left: x(ppm) }} />
      </div>
      <div className="mt-2 flex justify-between text-[12px] text-slate-500"><span>Billigere</span><span>Typisk {kr(basis.median)}/m²</span><span>Dyrere</span></div>
    </div>
  );
}

function Money({ home, d, household, onHousehold }: { home: BuyerHome; d: Detail | null; household: Household; onHousehold: (h: Household) => void }) {
  const rate = d?.rates?.household.fixed ?? 4.5;
  const [downPct, setDownPct] = useState(5);
  const [owner, setOwner] = useState(() => defaultOwnerCost(home.type, home.area, home.price));
  const [edit, setEdit] = useState(false);
  const [editHh, setEditHh] = useState(false);
  useEffect(() => { setOwner(defaultOwnerCost(home.type, home.area, home.price)); setDownPct(5); }, [home.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const f = useMemo(() => financing(home.price, { downPct, mortgageRate: rate, ownerCost: owner, couple: household.couple }), [home.price, downPct, rate, owner, household.couple]);
  const cap = household.income ? capacity(household.income, household.savings ?? 0, household.debt ?? 0) : null;
  const banks = INSTITUTES.map((i) => ({ ...i, yearly: yearlyBidrag(home.price, f.mortgage, i.bands) })).sort((a, b) => a.yearly - b.yearly);
  const num = (v: number | null, set: (n: number | null) => void, label: string) => (
    <label className="block min-w-0"><span className="text-[12px] text-slate-500">{label}</span>
      <input inputMode="numeric" value={v == null ? "" : v.toLocaleString("da-DK")} placeholder="0" onChange={(e) => { const x = e.target.value.replace(/\D/g, ""); set(x ? Number(x) : null); }}
        className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[16px] tabular-nums focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" />
    </label>
  );
  return (
    <>
      <Tile title="Pr. måned" right={<button type="button" onClick={() => setEdit(!edit)} className="text-[13px] font-semibold text-blue-700 hover:underline">{edit ? "Færdig" : "Ret tal"}</button>}>
        <Big>{kr(f.monthlyNet)}</Big>
        <p className="mt-1.5 text-[14px] text-slate-500">Efter rentefradrag, med {pct(downPct, 0)} udbetaling</p>
        <dl className="mt-4 space-y-1.5 text-[14px]">
          <div className="flex justify-between"><dt className="text-slate-500">Lån</dt><dd className="tabular-nums">{kr(f.mortgagePay + f.bankPay)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Ejerudgift</dt><dd className="tabular-nums">{kr(f.ownerCost)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Rentefradrag</dt><dd className="tabular-nums text-emerald-700">−{kr(f.deductionMonthly)}</dd></div>
          <div className="flex justify-between border-t border-slate-100 pt-1.5"><dt className="text-slate-500">Kontant ved køb</dt><dd className="font-semibold tabular-nums">{kr(f.cashNeeded)}</dd></div>
        </dl>
        {edit && (
          <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-3">
            <label className="block"><span className="flex justify-between text-[12px] text-slate-500"><span>Udbetaling</span><span className="font-semibold text-slate-900">{pct(downPct, 0)}</span></span>
              <input type="range" min={5} max={50} value={downPct} onChange={(e) => setDownPct(Number(e.target.value))} className="mt-2 w-full accent-blue-600" /></label>
            {num(owner, (n) => setOwner(n ?? 0), "Ejerudgift pr. måned (står i salgsopstillingen)")}
          </div>
        )}
        <p className="mt-3 text-[12px] text-slate-400">Rente {pct(rate)} inkl. bidrag{d?.rates ? `, Nationalbanken ${d.rates.label}` : ""}</p>
      </Tile>

      <Tile title="Kan I låne til den?">
        {cap && !editHh ? (
          <>
            <p className={`flex items-center gap-2 text-[22px] font-semibold leading-tight ${cap.maxPrice >= home.price ? "text-emerald-700" : "text-amber-700"}`}>
              {cap.maxPrice >= home.price ? <><Check size={24} strokeWidth={3} /> Ja, den passer</> : <><X size={24} strokeWidth={3} /> Lidt for dyr</>}
            </p>
            <p className="mt-1.5 text-[14px] text-slate-600">I kan købe for op til {mio(Math.floor(cap.maxPrice / 10000) * 10000)}.{cap.maxPrice < home.price && cap.limitedBy === "opsparing" ? ` I mangler ca. ${kr(f.cashNeeded - (household.savings ?? 0))} i opsparing.` : ""}</p>
            <button type="button" onClick={() => setEditHh(true)} className="mt-3 text-[13px] font-semibold text-blue-700 hover:underline">Ret jeres tal</button>
          </>
        ) : (
          <>
            <p className="text-[14px] text-slate-600">Skriv jeres tal, så svarer vi med det samme.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="col-span-2">{num(household.income, (n) => onHousehold({ ...household, income: n }), "Indkomst før skat, om året")}</div>
              {num(household.savings, (n) => onHousehold({ ...household, savings: n }), "Opsparing")}
              {num(household.debt, (n) => onHousehold({ ...household, debt: n }), "Anden gæld")}
            </div>
            <label className="mt-2 flex min-h-[36px] items-center gap-2 text-[14px] text-slate-600"><input type="checkbox" checked={household.couple} onChange={(e) => onHousehold({ ...household, couple: e.target.checked })} className="h-4 w-4 accent-blue-600" /> Vi køber to</label>
            {editHh && cap && <button type="button" onClick={() => setEditHh(false)} className="mt-2 min-h-[40px] rounded-full bg-slate-900 px-4 text-[14px] font-semibold text-white">Se svaret</button>}
          </>
        )}
      </Tile>

      <Tile title="Billigste realkreditlån">
        <ul className="space-y-1.5">
          {banks.map((b, i) => (
            <li key={b.name} className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${i === 0 ? "bg-emerald-50 ring-1 ring-emerald-200" : ""}`}>
              <span className="text-[14px] font-semibold">{b.name}{i === 0 && <span className="ml-2 text-[12px] font-semibold text-emerald-700">Billigst</span>}</span>
              <span className="text-[14px] tabular-nums text-slate-700">{kr(b.yearly / 12)}/md.</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[13px] text-slate-500">Renten er den samme alle steder. Forskellen er bidraget: {kr(banks[banks.length - 1].yearly - banks[0].yearly)} om året.</p>
      </Tile>
    </>
  );
}

function EquityTile({ home, d, expected }: { home: BuyerHome; d: Detail | null; expected: number }) {
  const rate = d?.rates?.household.fixed ?? 4.5;
  const growth = Math.max(0, Math.min(3, d?.trend.growth ?? 2));
  const f = useMemo(() => financing(home.price, { mortgageRate: rate, ownerCost: 0 }), [home.price, rate]);
  const path = useMemo(() => equityPath(f, home.price, growth, rate), [f, home.price, growth, rate]);
  const gap = d && d.basis.n >= 8 ? expected - home.price : 0;
  return (
    <Tile title="Din friværdi" className="lg:col-span-2">
      <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-1 sm:gap-3">
          {[0, 5, 10].map((y) => (
            <div key={y}><p className="text-[12px] text-slate-500">{y === 0 ? "Ved køb" : `Om ${y} år`}</p><p className="text-[20px] font-semibold tabular-nums">{mio(path[y].equity)}</p></div>
          ))}
        </div>
        <div className="h-[150px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={path.map((p) => ({ år: p.year, v: Math.round(p.equity) }))} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <defs><linearGradient id="eqf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity={0.28} /><stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} /></linearGradient></defs>
              <XAxis dataKey="år" tickFormatter={(v) => (v === 0 ? "Nu" : `${v} år`)} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={4} />
              <Tooltip formatter={(v) => [kr(Number(v)), "Friværdi"]} labelFormatter={(v) => (v === 0 ? "Ved køb" : `Om ${v} år`)} />
              <Area type="monotone" dataKey="v" stroke="#2563eb" strokeWidth={2.5} fill="url(#eqf)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <p className="mt-2 text-[13px] text-slate-500">Afdrag plus {pct(growth)} prisstigning om året.{gap > 50_000 ? ` Køber du til områdets pris, er den ca. ${mio(gap)} mere værd fra start.` : ""}</p>
    </Tile>
  );
}

function Plans({ plans }: { plans: (Plan & { kind: string })[] }) {
  const [all, setAll] = useState(false);
  if (!plans.length) return <p className="text-[15px] text-slate-600">Ingen nye lokalplaner inden for 2 km de seneste 3 år. Et roligt område.</p>;
  const housing = plans.filter((p) => /bolig/i.test(p.kind)).length;
  const shown = all ? plans : plans.slice(0, 4);
  return (
    <>
      <p className="text-[16px] font-medium">{plans.length} nye lokalplaner inden for 2 km{housing ? `, ${housing} med boliger` : ""}. <span className="text-slate-500">{plans.length >= 10 ? "Et område i vækst." : plans.length >= 4 ? "Der sker en del." : "Lidt aktivitet."}</span></p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {shown.map((p) => (
          <li key={p.id} className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-violet-700">{p.status === "forslag" ? "Forslag" : "Vedtaget"}{p.distanceM != null ? ` · ${p.distanceM < 1000 ? `${Math.round(p.distanceM / 10) * 10} m` : `${(p.distanceM / 1000).toFixed(1).replace(".", ",")} km`}` : ""}</p>
            <p className="mt-0.5 line-clamp-2 text-[14px] font-semibold leading-snug">{p.name}</p>
            <p className="mt-0.5 flex items-center justify-between gap-2 text-[12px] text-slate-500"><span>{p.kind}</span>{p.link && <a href={p.link} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"><FileText size={12} /> Plan</a>}</p>
          </li>
        ))}
      </ul>
      {plans.length > 4 && <button type="button" onClick={() => setAll(!all)} className="mt-3 text-[14px] font-semibold text-blue-700 hover:underline">{all ? "Vis færre" : `Vis alle ${plans.length}`}</button>}
    </>
  );
}

/** Local news for a kommune: a short summary and the top items, each with its source. Loads when it scrolls into view. */
export function News({ slug, name, max = 3 }: { slug: string; name: string; max?: number }) {
  const [n, setN] = useState<AreaNews | null | "loading" | "idle">("idle");
  const [more, setMore] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setN("idle");
    const el = ref.current;
    if (!el) return;
    let live = true;
    const io = new IntersectionObserver((e) => {
      if (!e[0].isIntersecting) return;
      io.disconnect();
      setN("loading");
      fetch(`/api/boligkoeb/news?kommune=${encodeURIComponent(slug)}`).then((r) => r.json()).then((j) => live && setN(j.ok ? j.news : null)).catch(() => live && setN(null));
    }, { rootMargin: "300px" });
    io.observe(el);
    return () => { live = false; io.disconnect(); };
  }, [slug]);
  return (
    <div ref={ref}>
      {n === "idle" || n === "loading" ? (
        <p className="flex items-center gap-2 text-[14px] text-slate-500"><Loader2 size={16} className="animate-spin" /> Læser lokale nyheder om {name} …</p>
      ) : !n || (!n.items.length && !n.summary) ? (
        <p className="text-[14px] text-slate-500">Ingen nyheder lige nu.</p>
      ) : (
        <>
          {n.summary && <p className="text-[15px] leading-relaxed text-slate-700"><b className={n.outlook === "vaekst" ? "text-emerald-700" : n.outlook === "tilbagegang" ? "text-rose-700" : "text-slate-900"}>{n.outlook === "vaekst" ? "I vækst. " : n.outlook === "tilbagegang" ? "Under pres. " : ""}</b>{n.summary}</p>}
          <ul className="mt-3 space-y-2.5">
            {(more ? n.items : n.items.slice(0, max)).map((i) => (
              <li key={i.url + i.title} className="flex gap-2.5">
                <span className={`mt-[7px] h-2 w-2 shrink-0 rounded-full ${i.effect === "positiv" ? "bg-emerald-500" : i.effect === "negativ" ? "bg-rose-500" : "bg-slate-300"}`} />
                <a href={i.url} target="_blank" rel="noopener nofollow" className="group min-w-0">
                  <span className="block text-[14px] font-semibold leading-snug text-slate-900 group-hover:underline">{i.title}</span>
                  <span className="text-[12px] text-slate-500">{i.source}{i.date ? ` · ${i.date}` : ""}</span>
                </a>
              </li>
            ))}
          </ul>
          {n.items.length > max && <button type="button" onClick={() => setMore(!more)} className="mt-3 text-[14px] font-semibold text-blue-700 hover:underline">{more ? "Vis færre" : `Vis alle ${n.items.length}`}</button>}
        </>
      )}
    </div>
  );
}

function Records({ dos, price, energy }: { dos: { dossier: Dossier | null; burdens: FutureBurdens | null } | "loading" | null; price: number; energy: string | null }) {
  if (dos === "loading") return <p className="flex items-center gap-2 text-[14px] text-slate-500"><Loader2 size={16} className="animate-spin" /> Henter fra BBR …</p>;
  const d = dos?.dossier;
  const rows: [string, string][] = [];
  // The register sometimes answers for the whole plot or building (several homes). A valuation far
  // from the asking price is then not this home's, so it is left out rather than shown wrong.
  const val = d?.valuation?.propertyValue ?? null;
  const fits = val != null && price > 0 && price / val > 0.6 && price / val < 3.5;
  if (fits) rows.push(["Offentlig vurdering", `${mio(val!)}`]);
  if (fits && d?.landTax) rows.push(["Grundskyld", `${kr(d.landTax.annual / 12)}/md.`]);
  // When the valuation is for a bigger property, the building facts may be for another building too.
  const trust = val == null || fits;
  if (trust && d?.building?.renovatedYear) rows.push(["Ombygget", String(d.building.renovatedYear)]);
  if (trust && d?.building?.heating) rows.push(["Varme", d.building.heating]);
  if (trust && d?.building?.roof) rows.push(["Tag", d.building.roof]);
  if (trust && d?.building?.wall) rows.push(["Vægge", d.building.wall]);
  if (energy) rows.push(["Energimærke", energy]);
  const warnings = [...(trust ? d?.risks ?? [] : []).map((r) => r.title), ...(dos?.burdens?.burdens ?? []).filter((x) => x.severity === "burden").map((x) => x.title.replace(/:.*/, ""))].filter((t, i, a) => a.indexOf(t) === i);
  if (!rows.length && !warnings.length) return <p className="text-[14px] text-slate-500">Adressen kunne ikke slås op i registrene.</p>;
  return (
    <>
      <dl className="space-y-1.5 text-[14px]">
        {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="shrink-0 text-slate-500">{k}</dt><dd className="min-w-0 truncate text-right font-medium">{v}</dd></div>)}
      </dl>
      {warnings.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{warnings.map((w) => <span key={w} className="rounded-full bg-amber-50 px-2.5 py-1 text-[12px] font-semibold text-amber-800 ring-1 ring-amber-200">{w}</span>)}</div>}
      {fits && <p className="mt-3 text-[12px] text-slate-400">Prisen er {Math.round((price / val!) * 100)} % af den offentlige vurdering, som ofte er lavere end handelsprisen.</p>}
    </>
  );
}

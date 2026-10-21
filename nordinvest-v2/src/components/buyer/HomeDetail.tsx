"use client";
/* eslint-disable @next/next/no-img-element -- listing photos come from the portals' own image CDN */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ArrowDown, ArrowUp, Bell, Check, FileText, Heart, Loader2, MapPinned, Share2, X } from "lucide-react";
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
import { Gallery } from "./Gallery";
import { HomeSource } from "./Pulse";
import { Pegman } from "./StreetView";

/*
 * The home, in the side panel. Everything about it is here, split into short
 * sections the buyer steps through with the arrows (or a flick of the wheel or
 * the thumb) instead of one long scroll: the home and its verdict, what it
 * costs a month and whether you can borrow for it, the cheapest loan,
 * friværdi, the area, building projects, the facts, local news and similar
 * homes. One idea per section, numbers first, short sentences.
 */

type Detail = {
  home: BuyerHome;
  listing: { image: string | null; url: string | null; broker?: string | null; history: { d: string; price: number }[] };
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

export function Follow({ home, saved, onToggleSave, onUpdate, withNote = true }: { home: BuyerHome; saved?: SavedHome; onToggleSave: () => void; onUpdate: (s: SavedHome) => void; withNote?: boolean }) {
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
            className={`min-h-[34px] rounded-full px-3 text-[13px] font-semibold transition-colors ${saved.stage === s.id ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-slate-300"}`}>{s.label}</button>
        ))}
      </div>
      <label className="mt-2.5 flex min-h-[36px] cursor-pointer items-center gap-2.5 text-[14px] text-slate-700">
        <input type="checkbox" checked={saved.alert} onChange={(e) => onUpdate({ ...saved, alert: e.target.checked })} className="h-4 w-4 accent-emerald-600" />
        <Bell size={15} className="text-slate-400" /> Mail ved prisfald og salg
      </label>
      {withNote && (
        <textarea value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== (saved.note ?? "") && onUpdate({ ...saved, note })} rows={2} placeholder="Noter, fx fra fremvisningen"
          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[15px] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
      )}
    </div>
  );
}

/* ───────────────────────── The panel ───────────────────────── */

type PanelProps = {
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
  /** When set, the analysis is behind a login: this is shown instead. */
  locked?: React.ReactNode;
  /** Opens street view in front of the home. */
  onStreet?: () => void;
};

const H = ({ children }: { children: React.ReactNode }) => <h2 className="text-[13px] font-semibold uppercase tracking-[0.07em] text-slate-400">{children}</h2>;
const Big = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => <p className={`text-[32px] font-semibold leading-none tabular-nums tracking-[-0.025em] ${className}`}>{children}</p>;
const Skel = ({ h = 90 }: { h?: number }) => <div className="animate-pulse rounded-2xl bg-slate-100" style={{ height: h }} />;
const Box = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => <div className={`rounded-2xl bg-slate-50 p-3.5 ${className}`}>{children}</div>;

export function HomePanel(p: PanelProps) {
  const { home } = p;
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState(false);
  const [dos, setDos] = useState<{ dossier: Dossier | null; burdens: FutureBurdens | null } | "loading" | null>("loading");
  const [i, setI] = useState(0);
  const images = useImages([home.id]);

  useEffect(() => {
    let live = true;
    setD(null); setErr(false); setDos("loading"); setI(0);
    if (p.locked) return;
    fetch(`/api/boligkoeb/home?id=${encodeURIComponent(home.id)}`).then((r) => r.json()).then((j) => { if (!live) return; if (j.ok) setD(j); else setErr(true); }).catch(() => live && setErr(true));
    fetch(`/api/boligkoeb/dossier?id=${encodeURIComponent(home.id)}`).then((r) => r.json()).then((j) => { if (live) setDos(j.ok ? { dossier: j.dossier, burdens: j.burdens } : null); }).catch(() => live && setDos(null));
    return () => { live = false; };
  }, [home.id, !!p.locked]); // eslint-disable-line react-hooks/exhaustive-deps

  const img = d?.listing.image ?? images.get(home.id) ?? null;
  const expected = Math.round((home.expPpm * home.area) / 10000) * 10000;

  // Five full sections, each one screen: the home, the money, its value, the surroundings, the facts.
  const Rule = () => <div className="my-5 border-t border-slate-100" />;
  const sections: { id: string; title: string; body: React.ReactNode }[] = [
    { id: "bolig", title: "Boligen", body: <SecHome {...p} d={d} img={img} expected={expected} /> },
    { id: "okonomi", title: "Økonomi", body: <><SecMoney home={home} d={d} household={p.household} onHousehold={p.onHousehold} /><Rule /><SecLoan home={home} d={d} /></> },
    { id: "vaerdi", title: "Værdi", body: <><SecEquity home={home} d={d} expected={expected} /><Rule /><SecArea home={home} d={d} /></> },
    { id: "omgivelser", title: "Omgivelser", body: <><SecPlans d={d} onShowPlans={p.onShowPlans} />{home.kommune && <><Rule /><SecNews slug={home.kommune} name={p.kommuneName ?? home.kommune} /></>}</> },
    { id: "fakta", title: "Fakta", body: <><SecFacts dos={dos} price={home.price} energy={home.energy} />{d && d.listing.history.length > 1 && <><Rule /><SecHistory history={d.listing.history} /></>}<Rule /><SecSimilar d={d} onSelect={p.onSelect} /></> },
  ];
  // Local news can take a while the first time: start it as soon as the home opens.
  useEffect(() => { if (home.kommune && !p.locked) void prefetchNews(home.kommune); }, [home.kommune, p.locked]);
  const last = sections.length - 1;
  const go = useCallback((n: number) => setI((cur) => Math.max(0, Math.min(last, typeof n === "number" ? n : cur))), [last]);

  // The wheel and a vertical swipe step between sections; a section taller than the panel scrolls first.
  const stage = useRef<HTMLDivElement>(null);
  const lock = useRef(0);
  const step = useCallback((dir: 1 | -1, target: EventTarget | null) => {
    const sec = (target as HTMLElement | null)?.closest?.("[data-sec]") as HTMLElement | null;
    if (sec) {
      const canDown = sec.scrollTop + sec.clientHeight < sec.scrollHeight - 2, canUp = sec.scrollTop > 2;
      if ((dir === 1 && canDown) || (dir === -1 && canUp)) return false;
    }
    if (Date.now() - lock.current < 650) return true;
    lock.current = Date.now();
    setI((cur) => Math.max(0, Math.min(last, cur + dir)));
    return true;
  }, [last]);
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => { if (Math.abs(e.deltaY) < 12) return; if (step(e.deltaY > 0 ? 1 : -1, e.target)) e.preventDefault(); };
    let y0 = 0, t0: EventTarget | null = null;
    const onStart = (e: TouchEvent) => { y0 = e.touches[0].clientY; t0 = e.target; };
    const onEnd = (e: TouchEvent) => { const dy = y0 - e.changedTouches[0].clientY; if (Math.abs(dy) > 60) step(dy > 0 ? 1 : -1, t0); };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => { el.removeEventListener("wheel", onWheel); el.removeEventListener("touchstart", onStart); el.removeEventListener("touchend", onEnd); };
  }, [step]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.("input,textarea,select")) return;
      if (e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); setI((c) => Math.min(last, c + 1)); }
      if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); setI((c) => Math.max(0, c - 1)); }
      if (e.key === "Escape") p.onClose();
    };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [last, p]);

  const tabs = useRef<HTMLDivElement>(null);
  useEffect(() => { tabs.current?.querySelector<HTMLElement>(`[data-tab="${i}"]`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" }); }, [i]);

  const share = async () => {
    const url = `${location.origin}/?bolig=${encodeURIComponent(home.id)}`;
    try { if (navigator.share) await navigator.share({ title: home.address, url }); else { await navigator.clipboard.writeText(url); alert("Linket er kopieret."); } } catch { /* cancelled */ }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <div data-drag className="flex items-center gap-1.5 border-b border-slate-100 px-2.5 py-2">
        <button type="button" onClick={p.onClose} aria-label="Luk boligen" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"><X size={19} /></button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight">{home.address.split(",")[0]}</p>
          <p className="truncate text-[12px] text-slate-500">{mio(home.price)} · {home.area} m²</p>
        </div>
        <button type="button" onClick={share} aria-label="Del boligen" className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"><Share2 size={17} /></button>
        <button type="button" onClick={p.onToggleSave} aria-pressed={!!p.saved} aria-label={p.saved ? "Fjern fra gemte" : "Gem boligen"} className={`flex h-10 w-10 items-center justify-center rounded-full ${p.saved ? "bg-rose-50 text-rose-600" : "text-slate-500 hover:bg-slate-100 hover:text-rose-500"}`}><Heart size={18} fill={p.saved ? "currentColor" : "none"} /></button>
      </div>

      {p.locked ? <div className="min-h-0 flex-1 overflow-y-auto">{p.locked}</div> : (
        <>
          <div ref={tabs} className="flex gap-0.5 overflow-x-auto border-b border-slate-100 px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Afsnit">
            {sections.map((s, n) => (
              <button key={s.id} type="button" role="tab" data-tab={n} aria-selected={i === n} onClick={() => go(n)}
                className={`min-h-[34px] flex-1 shrink-0 whitespace-nowrap rounded-full px-2.5 text-[13px] font-semibold transition-colors ${i === n ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}>{s.title}</button>
            ))}
          </div>

          <div ref={stage} className="relative min-h-0 flex-1 overflow-hidden">
            <div className="h-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ transform: `translateY(-${i * 100}%)` }}>
              {sections.map((s, n) => (
                <section key={s.id} data-sec aria-hidden={n !== i} className="h-full overflow-y-auto overscroll-contain px-5 pb-6 pt-4 [scrollbar-width:thin]">
                  {Math.abs(n - i) <= 1 ? s.body : null}
                </section>
              ))}
            </div>
          </div>

          {err && <p className="mx-4 mb-2 rounded-xl bg-rose-50 px-3 py-2 text-[13px] text-rose-800">Noget data kunne ikke hentes. Prøv igen om lidt.</p>}
          <div className="flex items-center gap-2 border-t border-slate-100 px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
            <button type="button" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Forrige afsnit" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:border-slate-300 disabled:opacity-30"><ArrowUp size={19} /></button>
            <span className="w-12 shrink-0 text-center text-[13px] font-medium tabular-nums text-slate-400">{i + 1} / {sections.length}</span>
            <button type="button" onClick={() => go(i === last ? 0 : i + 1)} className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 text-[15px] font-semibold text-white hover:bg-emerald-500">
              <span className="truncate">{i === last ? "Til toppen" : `Næste: ${sections[i + 1].title}`}</span>{i === last ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ───────────────────────── Sections ───────────────────────── */

function SecHome(p: PanelProps & { d: Detail | null; img: string | null; expected: number }) {
  const { home, d } = p;
  const hist = d?.listing.history ?? [];
  const first = hist.length ? hist[0].price : home.price;
  return (
    <div className="space-y-4">
      <div className="-mx-5 -mt-4">
        <Gallery id={home.id} fallback={p.img} alt={home.address} badge={first > home.price ? <span className="rounded-lg bg-emerald-600 px-2 py-1 text-[12px] font-semibold text-white">Sat ned {kr(first - home.price)}</span> : undefined} />
      </div>
      <div>
        <Big>{kr(home.price)}</Big>
        <p className="mt-1.5 text-[15px] text-slate-600">{home.address}</p>
      </div>
      <div className="rounded-2xl p-4" style={{ background: `${VERDICT_COLOR[home.verdict]}12` }}>
        <VerdictPill v={home.verdict} large />
        <p className="mt-2 text-[16px] font-medium leading-snug">{verdictLine(home)}</p>
        {d ? <RangeBar basis={d.basis} ppm={home.ppm} /> : <div className="mt-3"><Skel h={32} /></div>}
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center">
        {[["Størrelse", `${home.area} m²`], ["Værelser", home.rooms ? String(home.rooms) : "–"], ["Byggeår", home.year ? String(home.year) : "–"], ["Pr. m²", kr(home.ppm)], ["Type", TYPE_LABEL[home.type] ?? "Bolig"], ["Energi", home.energy ?? "–"]].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-slate-50 px-2 py-2.5"><dt className="text-[11px] font-medium text-slate-500">{k}</dt><dd className="mt-0.5 truncate text-[14px] font-semibold">{v}</dd></div>
        ))}
      </dl>
      <Follow home={home} saved={p.saved} onToggleSave={p.onToggleSave} onUpdate={p.onUpdate} />
      {p.onStreet && (
        <button type="button" onClick={p.onStreet} className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border border-slate-300 bg-white text-[15px] font-semibold text-slate-900 hover:border-amber-400 hover:bg-amber-50">
          <Pegman size={22} /> Gå rundt i gaden
        </button>
      )}
      <HomeSource broker={d?.listing.broker ?? null} url={d?.listing.url ?? null} since={home.knownStart ? home.firstSeen : null} />
    </div>
  );
}

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

function NumIn({ v, set, label }: { v: number | null; set: (n: number | null) => void; label: string }) {
  return (
    <label className="block min-w-0"><span className="text-[12px] text-slate-500">{label}</span>
      <input inputMode="numeric" value={v == null ? "" : v.toLocaleString("da-DK")} placeholder="0" onChange={(e) => { const x = e.target.value.replace(/\D/g, ""); set(x ? Number(x) : null); }}
        className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[16px] tabular-nums focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
    </label>
  );
}

function SecMoney({ home, d, household, onHousehold }: { home: BuyerHome; d: Detail | null; household: Household; onHousehold: (h: Household) => void }) {
  const rate = d?.rates?.household.fixed ?? 4.5;
  const [downPct, setDownPct] = useState(5);
  const [owner, setOwner] = useState(() => defaultOwnerCost(home.type, home.area, home.price));
  const [editHh, setEditHh] = useState(false);
  const [knobs, setKnobs] = useState(false);
  const f = useMemo(() => financing(home.price, { downPct, mortgageRate: rate, ownerCost: owner, couple: household.couple }), [home.price, downPct, rate, owner, household.couple]);
  const cap = household.income ? capacity(household.income, household.savings ?? 0, household.debt ?? 0) : null;
  return (
    <div className="space-y-4">
      <div>
        <H>Pr. måned</H>
        <Big className="mt-2">{kr(f.monthlyNet)}</Big>
        <p className="mt-1.5 text-[14px] text-slate-500">Efter rentefradrag · {kr(f.cashNeeded)} kontant ved køb</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Box><p className="text-[11px] text-slate-500">Lån</p><p className="text-[14px] font-semibold tabular-nums">{kr(f.mortgagePay + f.bankPay)}</p></Box>
          <Box><p className="text-[11px] text-slate-500">Ejerudgift</p><p className="text-[14px] font-semibold tabular-nums">{kr(f.ownerCost)}</p></Box>
          <Box><p className="text-[11px] text-slate-500">Fradrag</p><p className="text-[14px] font-semibold tabular-nums text-emerald-700">−{kr(f.deductionMonthly)}</p></Box>
        </div>
        {knobs ? (
          <div className="mt-3 space-y-2 rounded-2xl bg-slate-50 p-3">
            <label className="block"><span className="flex justify-between text-[12px] text-slate-500"><span>Udbetaling</span><span className="font-semibold text-slate-900">{pct(downPct, 0)} · {kr(f.down)}</span></span>
              <input type="range" min={5} max={50} value={downPct} onChange={(e) => setDownPct(Number(e.target.value))} className="mt-1.5 w-full accent-emerald-600" /></label>
            <NumIn v={owner} set={(n) => setOwner(n ?? 0)} label="Ejerudgift pr. måned (står i salgsopstillingen)" />
          </div>
        ) : null}
        <p className="mt-2 flex items-center justify-between text-[12px] text-slate-400"><span>{pct(downPct, 0)} udbetaling · rente {pct(rate)} inkl. bidrag</span><button type="button" onClick={() => setKnobs(!knobs)} className="font-semibold text-emerald-700">{knobs ? "Færdig" : "Ret tal"}</button></p>
      </div>
      <div className="border-t border-slate-100 pt-4">
        <H>Kan I låne til den?</H>
        {cap && !editHh ? (
          <div className="mt-2">
            <p className={`flex items-center gap-2 text-[22px] font-semibold ${cap.maxPrice >= home.price ? "text-emerald-700" : "text-amber-700"}`}>{cap.maxPrice >= home.price ? <><Check size={22} strokeWidth={3} /> Ja, den passer</> : <><X size={22} strokeWidth={3} /> Lidt for dyr</>}</p>
            <p className="mt-1 text-[14px] text-slate-600">I kan købe for op til {mio(Math.floor(cap.maxPrice / 10000) * 10000)}.</p>
            <button type="button" onClick={() => setEditHh(true)} className="mt-2 text-[13px] font-semibold text-emerald-700 hover:underline">Ret jeres tal</button>
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="col-span-2"><NumIn v={household.income} set={(n) => onHousehold({ ...household, income: n })} label="Indkomst før skat, om året" /></div>
            <NumIn v={household.savings} set={(n) => onHousehold({ ...household, savings: n })} label="Opsparing" />
            <NumIn v={household.debt} set={(n) => onHousehold({ ...household, debt: n })} label="Anden gæld" />
            <label className="col-span-2 flex min-h-[32px] items-center gap-2 text-[14px] text-slate-600"><input type="checkbox" checked={household.couple} onChange={(e) => onHousehold({ ...household, couple: e.target.checked })} className="h-4 w-4 accent-emerald-600" /> Vi køber to</label>
            {editHh && cap && <button type="button" onClick={() => setEditHh(false)} className="col-span-2 min-h-[40px] rounded-full bg-slate-900 text-[14px] font-semibold text-white">Se svaret</button>}
          </div>
        )}
      </div>
    </div>
  );
}

function SecLoan({ home, d }: { home: BuyerHome; d: Detail | null }) {
  const rate = d?.rates?.household.fixed ?? 4.5;
  const f = useMemo(() => financing(home.price, { mortgageRate: rate, ownerCost: 0 }), [home.price, rate]);
  const banks = INSTITUTES.map((x) => ({ ...x, yearly: yearlyBidrag(home.price, f.mortgage, x.bands) })).sort((a, b) => a.yearly - b.yearly);
  return (
    <div>
      <div className="flex items-baseline justify-between"><H>Billigste realkreditlån</H><span className="text-[12px] text-slate-400">bidrag pr. md.</span></div>
      <ul className="mt-2.5 space-y-1.5">
        {banks.map((b, n) => (
          <li key={b.name} className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 ${n === 0 ? "bg-emerald-50 ring-1 ring-emerald-200" : "bg-slate-50"}`}>
            <span className="text-[14px] font-semibold">{b.name}{n === 0 && <span className="ml-2 text-[12px] text-emerald-700">Billigst</span>}</span>
            <span className="text-[14px] font-semibold tabular-nums">{kr(b.yearly / 12)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[13px] text-slate-500">Renten er den samme alle steder. Vælg {banks[0].name}, og spar {kr(banks[banks.length - 1].yearly - banks[0].yearly)} om året.</p>
    </div>
  );
}

function SecEquity({ home, d, expected }: { home: BuyerHome; d: Detail | null; expected: number }) {
  const rate = d?.rates?.household.fixed ?? 4.5;
  const growth = Math.max(0, Math.min(3, d?.trend.growth ?? 2));
  const f = useMemo(() => financing(home.price, { mortgageRate: rate, ownerCost: 0 }), [home.price, rate]);
  const path = useMemo(() => equityPath(f, home.price, growth, rate), [f, home.price, growth, rate]);
  const gap = d && d.basis.n >= 8 ? expected - home.price : 0;
  return (
    <div>
      <H>Din friværdi</H>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[0, 5, 10].map((y) => <Box key={y}><p className="text-[12px] text-slate-500">{y === 0 ? "Ved køb" : `Om ${y} år`}</p><p className="mt-0.5 text-[18px] font-semibold tabular-nums">{mio(path[y].equity)}</p></Box>)}
      </div>
      <div className="mt-3 h-[130px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={path.map((x) => ({ år: x.year, v: Math.round(x.equity) }))} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs><linearGradient id="eqp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#059669" stopOpacity={0.3} /><stop offset="100%" stopColor="#059669" stopOpacity={0.02} /></linearGradient></defs>
            <XAxis dataKey="år" tickFormatter={(v) => (v === 0 ? "Nu" : `${v} år`)} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={4} />
            <Tooltip formatter={(v) => [kr(Number(v)), "Friværdi"]} labelFormatter={(v) => (v === 0 ? "Ved køb" : `Om ${v} år`)} />
            <Area type="monotone" dataKey="v" stroke="#059669" strokeWidth={2.5} fill="url(#eqp)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[14px] text-slate-600">Afdrag plus {pct(growth)} prisstigning om året.</p>
      {gap > 50_000 && <p className="mt-2 rounded-2xl bg-emerald-50 px-4 py-2.5 text-[14px] text-emerald-900">Til områdets pris er den ca. <b>{mio(gap)}</b> mere værd fra start.</p>}
    </div>
  );
}

function SecArea({ home, d }: { home: BuyerHome; d: Detail | null }) {
  if (!d) return <Skel h={220} />;
  const tone = (v: number | null) => (v == null ? "" : v >= 0 ? "text-emerald-700" : "text-rose-700");
  return (
    <div>
      <H>Området</H>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Box><p className="text-[12px] text-slate-500">Priser seneste år</p><p className={`mt-0.5 text-[22px] font-semibold tabular-nums ${tone(d.trend.yoy)}`}>{d.trend.yoy != null ? `${d.trend.yoy > 0 ? "+" : ""}${pct(d.trend.yoy)}` : "–"}</p></Box>
        <Box><p className="text-[12px] text-slate-500">Om året, 10 år</p><p className="mt-0.5 text-[22px] font-semibold tabular-nums">{d.trend.growth != null ? `+${pct(d.trend.growth)}` : "–"}</p></Box>
        <Box><p className="text-[12px] text-slate-500">Til salg her</p><p className="mt-0.5 text-[22px] font-semibold tabular-nums">{d.area.homes}</p></Box>
        <Box><p className="text-[12px] text-slate-500">Sat ned i pris</p><p className="mt-0.5 text-[22px] font-semibold tabular-nums">{d.area.cutShare != null ? `${d.area.cutShare} %` : "–"}</p></Box>
      </div>
      <p className="mt-4 text-[16px] font-medium leading-snug">{d.area.cutShare != null && d.area.cutShare >= 30 ? "Mange er sat ned. Du kan byde lavere her." : d.area.cutShare != null && d.area.cutShare <= 12 ? "Få er sat ned. Boligerne sælges tæt på prisen." : "Normalt marked. Der er plads til at forhandle lidt."}</p>
      <p className="mt-2 text-[12px] text-slate-400">Postnummer {home.zip} · {d.trend.region} · Danmarks Statistik</p>
    </div>
  );
}

function SecPlans({ d, onShowPlans }: { d: Detail | null; onShowPlans: () => void }) {
  if (!d) return <Skel h={220} />;
  const plans = d.plans;
  const housing = plans.filter((x) => /bolig/i.test(x.kind)).length;
  return (
    <div>
      <H>Bygges der i nærheden?</H>
      {!plans.length ? <p className="mt-3 text-[16px]">Ingen nye lokalplaner inden for 2 km de seneste 3 år. Et roligt område.</p> : (
        <>
          <p className="mt-2 text-[18px] font-semibold leading-snug">{plans.length} nye lokalplaner inden for 2 km{housing ? `, ${housing} med boliger` : ""}.</p>
          <p className="text-[15px] text-slate-500">{plans.length >= 10 ? "Et område i vækst." : plans.length >= 4 ? "Der sker en del." : "Lidt aktivitet."}</p>
          <ul className="mt-3 space-y-2">
            {plans.slice(0, 3).map((x) => (
              <li key={x.id} className="rounded-2xl bg-slate-50 px-3.5 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-violet-700">{x.status === "forslag" ? "Forslag" : "Vedtaget"}{x.distanceM != null ? ` · ${x.distanceM < 1000 ? `${Math.round(x.distanceM / 10) * 10} m` : `${(x.distanceM / 1000).toFixed(1).replace(".", ",")} km`}` : ""}</p>
                <p className="line-clamp-1 text-[14px] font-semibold">{x.name}</p>
                <p className="flex items-center justify-between text-[12px] text-slate-500"><span>{x.kind}</span>{x.link && <a href={x.link} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-semibold text-emerald-700"><FileText size={12} /> Plan</a>}</p>
              </li>
            ))}
          </ul>
          <button type="button" onClick={onShowPlans} className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-violet-600 text-[14px] font-semibold text-white hover:bg-violet-500"><MapPinned size={16} /> Se alle {plans.length} på kortet</button>
        </>
      )}
    </div>
  );
}

function SecFacts({ dos, price, energy }: { dos: { dossier: Dossier | null; burdens: FutureBurdens | null } | "loading" | null; price: number; energy: string | null }) {
  if (dos === "loading") return <p className="flex items-center gap-2 text-[14px] text-slate-500"><Loader2 size={16} className="animate-spin" /> Henter fra BBR …</p>;
  const d = dos?.dossier;
  // The register sometimes answers for the whole plot or building (several homes); then the figures are not this home's.
  const val = d?.valuation?.propertyValue ?? null;
  const fits = val != null && price > 0 && price / val > 0.6 && price / val < 3.5;
  const trust = val == null || fits;
  const rows: [string, string][] = [];
  if (fits) rows.push(["Offentlig vurdering", mio(val!)]);
  if (fits && d?.landTax) rows.push(["Grundskyld", `${kr(d.landTax.annual / 12)}/md.`]);
  if (trust && d?.building?.renovatedYear) rows.push(["Ombygget", String(d.building.renovatedYear)]);
  if (trust && d?.building?.heating) rows.push(["Varme", d.building.heating]);
  if (trust && d?.building?.roof) rows.push(["Tag", d.building.roof]);
  if (trust && d?.building?.wall) rows.push(["Vægge", d.building.wall]);
  if (energy) rows.push(["Energimærke", energy]);
  const warnings = [...(trust ? d?.risks ?? [] : []).map((r) => r.title), ...(dos?.burdens?.burdens ?? []).filter((x) => x.severity === "burden").map((x) => x.title.replace(/:.*/, ""))].filter((t, n, a) => a.indexOf(t) === n);
  return (
    <div>
      <H>Fakta om boligen</H>
      {!rows.length && !warnings.length ? <p className="mt-3 text-[15px] text-slate-500">Adressen kunne ikke slås op i registrene.</p> : (
        <>
          <dl className="mt-3 divide-y divide-slate-100 rounded-2xl bg-slate-50 px-4">
            {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-3 py-2.5 text-[14px]"><dt className="shrink-0 text-slate-500">{k}</dt><dd className="min-w-0 truncate text-right font-semibold">{v}</dd></div>)}
          </dl>
          {warnings.length > 0 && <div className="mt-3"><p className="text-[13px] font-semibold text-amber-800">Værd at tjekke</p><div className="mt-1.5 flex flex-wrap gap-1.5">{warnings.map((w) => <span key={w} className="rounded-full bg-amber-50 px-2.5 py-1 text-[12px] font-semibold text-amber-800 ring-1 ring-amber-200">{w}</span>)}</div></div>}
          {fits && <p className="mt-3 text-[12px] text-slate-400">Prisen er {Math.round((price / val!) * 100)} % af den offentlige vurdering. Den er ofte lavere end handelsprisen.</p>}
        </>
      )}
      <p className="mt-3 text-[12px] text-slate-400">BBR, Vurderingsstyrelsen og Plandata. Læs altid tilstandsrapporten.</p>
    </div>
  );
}

function SecNews({ slug, name }: { slug: string; name: string }) {
  return <div><H>Nyt fra {name}</H><div className="mt-3"><News slug={slug} name={name} max={3} /></div></div>;
}

function SecHistory({ history }: { history: { d: string; price: number }[] }) {
  return (
    <div>
      <H>Prishistorik</H>
      <ol className="mt-2.5 space-y-1.5">
        {history.map((x, n) => {
          const prev = n > 0 ? history[n - 1].price : null;
          return (
            <li key={x.d + n} className="flex items-center justify-between text-[14px]">
              <span className="text-slate-500">{new Date(x.d).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}</span>
              <span className="font-semibold tabular-nums">{kr(x.price)}{prev != null && prev !== x.price && <span className={`ml-2 text-[12px] ${x.price < prev ? "text-emerald-700" : "text-rose-700"}`}>{x.price < prev ? "−" : "+"}{kr(Math.abs(x.price - prev))}</span>}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function SecSimilar({ d, onSelect }: { d: Detail | null; onSelect: (id: string) => void }) {
  if (!d) return <Skel h={220} />;
  return (
    <div>
      <H>Lignende boliger i nærheden</H>
      {!d.similar.length ? <p className="mt-3 text-[15px] text-slate-500">Ingen lignende boliger til salg tæt på.</p> : (
        <ul className="mt-2 divide-y divide-slate-100">
          {d.similar.slice(0, 4).map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => onSelect(s.id)} className="flex min-h-[54px] w-full items-center gap-3 text-left hover:bg-slate-50">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: VERDICT_COLOR[s.verdict] }} />
                <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-medium">{s.address.split(",")[0]}</span><span className="text-[12px] text-slate-500">{s.area} m² · {kr(s.ppm)}/m²</span></span>
                <span className="text-[14px] font-semibold tabular-nums">{mio(s.price)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/*
 * Local news per kommune, fetched once per page visit and kept, so stepping
 * between sections or homes never starts it over. Most kommuner are already
 * cached on the server (a cron keeps them fresh); a cold one can take a minute.
 */
const newsCache = new Map<string, Promise<AreaNews | null>>();
export function prefetchNews(slug: string): Promise<AreaNews | null> {
  if (!newsCache.has(slug)) {
    const p = fetch(`/api/boligkoeb/news?kommune=${encodeURIComponent(slug)}`).then((r) => r.json()).then((j) => (j.ok ? (j.news as AreaNews) : null)).catch(() => null);
    newsCache.set(slug, p);
    p.then((v) => { if (!v) newsCache.delete(slug); });
  }
  return newsCache.get(slug)!;
}

/** Local news for a kommune: a short summary and the top items, each with its source. */
export function News({ slug, name, max = 3 }: { slug: string; name: string; max?: number; start?: boolean }) {
  const [n, setN] = useState<AreaNews | null | "loading">("loading");
  const [more, setMore] = useState(false);
  const [slow, setSlow] = useState(false);
  const [retry, setRetry] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let live = true;
    setN("loading"); setSlow(false);
    const t = setTimeout(() => live && setSlow(true), 6000);
    prefetchNews(slug).then((v) => { if (live) setN(v); });
    return () => { live = false; clearTimeout(t); };
  }, [slug, retry]);
  return (
    <div ref={ref}>
      {n === "loading" ? (
        <div>
          <p className="flex items-center gap-2 text-[14px] text-slate-500"><Loader2 size={16} className="animate-spin" /> Læser lokale nyheder om {name} …</p>
          {slow && <p className="mt-2 text-[13px] text-slate-400">Første gang for {name} tager op til et minut. Du kan bladre videre imens.</p>}
          <div className="mt-4 space-y-2.5">{[0, 1, 2].map((x) => <div key={x} className="h-12 animate-pulse rounded-xl bg-slate-100" />)}</div>
        </div>
      ) : !n || (!n.items.length && !n.summary) ? (
        <div className="text-[14px] text-slate-500">Nyhederne kunne ikke hentes lige nu. <button type="button" onClick={() => setRetry((r) => r + 1)} className="font-semibold text-emerald-700 hover:underline">Prøv igen</button></div>
      ) : (
        <>
          {n.summary && <p className="text-[15px] leading-relaxed text-slate-700"><b className={n.outlook === "vaekst" ? "text-emerald-700" : n.outlook === "tilbagegang" ? "text-rose-700" : "text-slate-900"}>{n.outlook === "vaekst" ? "I vækst. " : n.outlook === "tilbagegang" ? "Under pres. " : ""}</b>{n.summary}</p>}
          <ul className="mt-3 space-y-2.5">
            {(more ? n.items : n.items.slice(0, max)).map((x) => (
              <li key={x.url + x.title} className="flex gap-2.5">
                <span className={`mt-[7px] h-2 w-2 shrink-0 rounded-full ${x.effect === "positiv" ? "bg-emerald-500" : x.effect === "negativ" ? "bg-rose-500" : "bg-slate-300"}`} />
                <a href={x.url} target="_blank" rel="noopener nofollow" className="group min-w-0">
                  <span className="block text-[14px] font-semibold leading-snug text-slate-900 group-hover:underline">{x.title}</span>
                  <span className="text-[12px] text-slate-500">{x.source}{x.date ? ` · ${x.date}` : ""}</span>
                </a>
              </li>
            ))}
          </ul>
          {n.items.length > max && <button type="button" onClick={() => setMore(!more)} className="mt-3 text-[14px] font-semibold text-emerald-700 hover:underline">{more ? "Vis færre" : `Vis alle ${n.items.length}`}</button>}
        </>
      )}
    </div>
  );
}

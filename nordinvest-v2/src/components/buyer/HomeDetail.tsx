"use client";
/* eslint-disable @next/next/no-img-element -- listing photos come from the portals' own image CDN */

import { useEffect, useMemo, useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeft, Building2, ExternalLink, FileText, Heart, Landmark, Loader2, MapPinned, Newspaper, Share2, TrendingDown, TrendingUp } from "lucide-react";
import type { Basis, BuyerHome } from "@/lib/buyer/market";
import { TYPE_LABEL } from "@/lib/buyer/market";
import type { Plan } from "@/lib/buyer/plans";
import type { MarketRates } from "@/lib/market-rates";
import type { Dossier } from "@/lib/dossier";
import type { FutureBurdens } from "@/lib/future-burdens";
import type { AreaNews } from "@/lib/buyer/news";
import type { Household } from "@/lib/buyer/state";
import { BANK_RATE, DEBT_FACTOR, INSTITUTES, INSTITUTES_AS_OF, capacity, defaultOwnerCost, equityPath, financing, yearlyBidrag } from "@/lib/buyer/finance";
import { VERDICT_COLOR } from "./BuyerMap";
import { kr, mio, pct, VerdictPill } from "./ui";

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

type Props = {
  home: BuyerHome;
  saved: boolean;
  household: Household;
  onHousehold: (h: Household) => void;
  onToggleSave: () => void;
  onClose: () => void;
  onSelect: (id: string) => void;
  onShowPlans: () => void;
  kommuneName: string | null;
};

const Section = ({ id, icon, title, children, lead }: { id?: string; icon: React.ReactNode; title: string; lead?: string; children: React.ReactNode }) => (
  <section id={id} className="border-t border-slate-100 px-5 py-6 sm:px-6">
    <h3 className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.01em] text-slate-900"><span className="text-slate-400">{icon}</span>{title}</h3>
    {lead && <p className="mt-1 text-[14px] leading-relaxed text-slate-500">{lead}</p>}
    <div className="mt-4">{children}</div>
  </section>
);

const Skeleton = ({ h = 80 }: { h?: number }) => <div className="animate-pulse rounded-xl bg-slate-100" style={{ height: h }} />;

export function HomeDetail({ home, saved, household, onHousehold, onToggleSave, onClose, onSelect, onShowPlans, kommuneName }: Props) {
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState(false);
  const [dos, setDos] = useState<{ dossier: Dossier | null; burdens: FutureBurdens | null } | "loading" | null>("loading");
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    setD(null); setErr(false); setDos("loading");
    scroller.current?.scrollTo({ top: 0 });
    fetch(`/api/boligkoeb/home?id=${encodeURIComponent(home.id)}`).then((r) => r.json()).then((j) => { if (!live) return; if (j.ok) setD(j); else setErr(true); }).catch(() => live && setErr(true));
    fetch(`/api/boligkoeb/dossier?id=${encodeURIComponent(home.id)}`).then((r) => r.json()).then((j) => { if (live) setDos(j.ok ? { dossier: j.dossier, burdens: j.burdens } : null); }).catch(() => live && setDos(null));
    return () => { live = false; };
  }, [home.id]);

  const share = async () => {
    const url = `${location.origin}/boligkoeb?bolig=${encodeURIComponent(home.id)}`;
    try { if (navigator.share) await navigator.share({ title: home.address, url }); else { await navigator.clipboard.writeText(url); alert("Linket er kopieret."); } } catch { /* cancelled */ }
  };

  const expected = Math.round((home.expPpm * home.area) / 10000) * 10000;
  const gap = home.price - expected;

  return (
    <div ref={scroller} className="h-full overflow-y-auto overscroll-contain bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-100 bg-white/95 px-3 py-2 backdrop-blur">
        <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100" aria-label="Tilbage til listen"><ArrowLeft size={20} /></button>
        <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-slate-900">{home.address.split(",")[0]}</p>
        <button type="button" onClick={share} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100" aria-label="Del boligen"><Share2 size={18} /></button>
        <button type="button" onClick={onToggleSave} aria-pressed={saved} className={`flex h-10 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold ${saved ? "bg-rose-50 text-rose-600" : "text-slate-700 hover:bg-slate-100"}`}>
          <Heart size={18} fill={saved ? "currentColor" : "none"} /> {saved ? "Gemt" : "Gem"}
        </button>
      </div>

      {/* Photo + key facts */}
      <div className="relative aspect-[16/9] w-full bg-slate-100">
        {d?.listing.image ? <img src={d.listing.image} alt={`Billede af ${home.address}`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-300"><Building2 size={40} /></div>}
      </div>
      <div className="px-5 pb-5 pt-4 sm:px-6">
        <p className="text-[13px] font-medium text-slate-500">{TYPE_LABEL[home.type] ?? "Bolig"}{home.year ? ` · opført ${home.year}` : ""}{home.energy ? ` · energimærke ${home.energy}` : ""}</p>
        <h2 className="mt-1 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-slate-900">{home.address}</h2>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="text-[26px] font-semibold tracking-[-0.02em] tabular-nums">{kr(home.price)}</span>
          <span className="text-[15px] text-slate-600 tabular-nums">{home.area} m²{home.rooms ? ` · ${home.rooms} vær.` : ""} · {kr(home.ppm)}/m²</span>
        </div>
        {d?.listing.url && <a href={d.listing.url} target="_blank" rel="noopener" className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 text-[14px] font-semibold text-blue-700 hover:underline">Se annoncen hos mægleren <ExternalLink size={14} /></a>}
      </div>

      {/* Verdict */}
      <div className="mx-5 mb-6 rounded-2xl border p-5 sm:mx-6" style={{ borderColor: `${VERDICT_COLOR[home.verdict]}55`, background: `${VERDICT_COLOR[home.verdict]}0d` }}>
        <div className="flex flex-wrap items-center gap-3">
          <VerdictPill v={home.verdict} large />
          <span className="text-[15px] font-semibold text-slate-900">
            {home.rank < 1 ? "Billigst pr. m² blandt lignende boliger i nærheden" : home.rank > 99 ? "Dyrest pr. m² blandt lignende boliger i nærheden" : home.rank <= 50 ? `Billigere pr. m² end ${100 - home.rank} % af lignende boliger` : `Dyrere pr. m² end ${home.rank} % af lignende boliger`}
          </span>
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-700">
          {home.verdict === "godt" && <>Boligen hører til den billigste fjerdedel pr. m² blandt lignende boliger til salg i området. Forventet pris ud fra området er ca. <b>{kr(expected)}</b>, så du betaler {kr(Math.abs(gap))} {gap < 0 ? "mindre" : "mere"}.</>}
          {home.verdict === "middel" && !home.suspect && <>Prisen er tæt på, hvad lignende boliger koster i området (ca. <b>{kr(expected)}</b>). Der er normalt plads til at forhandle et par procent.</>}
          {home.verdict === "dyrt" && <>Boligen hører til den dyreste fjerdedel pr. m² blandt lignende boliger til salg i området. Forventet pris er ca. <b>{kr(expected)}</b>, {kr(Math.abs(gap))} under udbudsprisen. Spørg mægleren, hvad der begrunder prisen, eller byd lavere.</>}
          {home.cutPct > 0 && <> Prisen er allerede sat ned med {pct(home.cutPct)}.</>}
        </p>
        {home.suspect && <p className="mt-3 rounded-lg bg-white/70 p-3 text-[14px] leading-relaxed text-amber-900 ring-1 ring-amber-200"><b>Tjek annoncen.</b> Prisen pr. m² ligger så langt fra lignende boliger, at der sandsynligvis er en fejl i annoncen: forkert areal, en andelsbolig eller husbåd listet som ejerlejlighed, eller en bolig, der skal totalrenoveres. Vi viser den derfor som middel.</p>}
        {d ? <RangeBar basis={d.basis} ppm={home.ppm} /> : <div className="mt-4"><Skeleton h={56} /></div>}
        {d && <p className="mt-3 text-[13px] leading-relaxed text-slate-500">Sammenlignet med {d.basis.n} {(TYPE_LABEL[home.type] ?? "boliger").toLowerCase()}er på {d.basis.band} til salg {d.basis.level === "naer" ? d.basis.place : d.basis.level === "postnummer" ? `i ${d.basis.place}` : d.basis.level === "kommune" ? `i ${kommuneName ?? "kommunen"} Kommune` : "i hele landet"}. Det er udbudspriser, ikke salgspriser: stand, beliggenhed i gaden og udsigt er ikke med.</p>}
      </div>

      {err && <p className="mx-6 mb-6 rounded-lg bg-rose-50 px-4 py-3 text-[14px] text-rose-800">Detaljerne kunne ikke hentes. Prøv igen om lidt.</p>}

      {d && d.listing.history.length > 1 && (
        <Section icon={<TrendingDown size={18} />} title="Prishistorik">
          <ol className="space-y-2">
            {d.listing.history.map((p, i) => (
              <li key={p.d + i} className="flex items-center justify-between text-[15px]">
                <span className="text-slate-600">{new Date(p.d).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}</span>
                <span className="font-semibold tabular-nums">{kr(p.price)}{i > 0 && p.price !== d.listing.history[i - 1].price && <span className={`ml-2 text-[13px] ${p.price < d.listing.history[i - 1].price ? "text-emerald-700" : "text-rose-700"}`}>{p.price < d.listing.history[i - 1].price ? "−" : "+"}{kr(Math.abs(p.price - d.listing.history[i - 1].price))}</span>}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      <Money home={home} d={d} household={household} onHousehold={onHousehold} expected={expected} />

      <Section icon={<MapPinned size={18} />} title="Området" lead={d ? `Postnummer ${home.zip} og ${d.trend.region}` : undefined}>
        {!d ? <Skeleton h={140} /> : (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <Stat label="Prisudvikling seneste år" value={d.trend.yoy != null ? `${d.trend.yoy > 0 ? "+" : ""}${pct(d.trend.yoy)}` : "–"} tone={d.trend.yoy == null ? undefined : d.trend.yoy >= 0 ? "pos" : "neg"} note={`Salgspriser, ${d.trend.region}`} />
              <Stat label="Om året, seneste 10 år" value={d.trend.growth != null ? `+${pct(d.trend.growth)}` : "–"} note="Danmarks Statistik" />
              <Stat label="Boliger til salg her" value={String(d.area.homes)} note={`${d.area.newLast30} nye de seneste 30 dage`} />
              <Stat label="Sat ned i pris" value={d.area.cutShare != null ? `${d.area.cutShare} %` : "–"} note="af boligerne i postnummeret" />
            </div>
            <p className="mt-3 text-[14px] leading-relaxed text-slate-600">
              {d.area.cutShare != null && d.area.cutShare >= 30 ? "Mange boliger i postnummeret er sat ned. Det er en købers marked her: du kan byde lavere." : d.area.cutShare != null && d.area.cutShare <= 12 ? "Få boliger er sat ned i postnummeret. Boligerne sælges tæt på udbudsprisen." : "Et normalt marked: nogle boliger sættes ned, og der er plads til forhandling."}
            </p>
          </>
        )}
      </Section>

      <Section icon={<Building2 size={18} />} title="Byggeprojekter i nærheden" lead="Lokalplaner fra de seneste 3 år inden for 2 km. En ny lokalplan er sådan, kommunen åbner for nye boliger, butikker, skoler og erhverv. Kilde: Plandata.dk">
        {!d ? <Skeleton h={120} /> : <Plans plans={d.plans} onShowPlans={onShowPlans} />}
      </Section>

      {home.kommune && <News slug={home.kommune} name={kommuneName ?? home.kommune} />}

      <Section icon={<Landmark size={18} />} title="Offentlige oplysninger" lead="Fra BBR, Vurderingsstyrelsen og Plandata for netop denne adresse.">
        <Records dos={dos} price={home.price} />
      </Section>

      {d && d.similar.length > 0 && (
        <Section icon={<Building2 size={18} />} title="Lignende boliger i nærheden">
          <ul className="divide-y divide-slate-100">
            {d.similar.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => onSelect(s.id)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-slate-50">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: VERDICT_COLOR[s.verdict] }} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-medium text-slate-900">{s.address.split(",")[0]}</span><span className="text-[13px] text-slate-500">{s.area} m² · {kr(s.ppm)}/m²</span></span>
                  <span className="text-[15px] font-semibold tabular-nums">{mio(s.price)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <p className="px-6 pb-10 pt-2 text-[12px] leading-relaxed text-slate-400">Vurderingen er et overblik ud fra offentlige data og udbudspriser, ikke en vurdering fra en ejendomsmægler eller en bank. Tjek altid tilstandsrapport, elinstallationsrapport og ejerudgifter i salgsopstillingen før du byder.</p>
    </div>
  );
}

function Stat({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "pos" | "neg" }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3.5">
      <p className="text-[12px] font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-[20px] font-semibold tabular-nums tracking-[-0.01em] ${tone === "pos" ? "text-emerald-700" : tone === "neg" ? "text-rose-700" : "text-slate-900"}`}>{value}</p>
      {note && <p className="mt-0.5 text-[12px] text-slate-500">{note}</p>}
    </div>
  );
}

/** Where this home's m² price sits among similar homes: the middle half and the median. */
function RangeBar({ basis, ppm }: { basis: Basis; ppm: number }) {
  if (!basis.n || !basis.median) return null;
  const lo = Math.min(basis.q1 * 0.75, ppm * 0.95), hi = Math.max(basis.q3 * 1.25, ppm * 1.05);
  const x = (v: number) => `${Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100))}%`;
  return (
    <div className="mt-5">
      <div className="relative h-2.5 rounded-full" style={{ background: `linear-gradient(90deg, ${VERDICT_COLOR.godt}55, ${VERDICT_COLOR.middel}55 50%, ${VERDICT_COLOR.dyrt}55)` }}>
        <div className="absolute top-0 h-full rounded-full bg-slate-900/10" style={{ left: x(basis.q1), width: `calc(${x(basis.q3)} - ${x(basis.q1)})` }} />
        <div className="absolute -top-1 h-[18px] w-0.5 bg-slate-500" style={{ left: x(basis.median) }} />
        <div className="absolute -top-[7px] h-6 w-6 -translate-x-1/2 rounded-full border-[3px] border-white shadow-[0_2px_6px_rgba(15,23,42,0.35)]" style={{ left: x(ppm), background: "#0f172a" }} />
      </div>
      <div className="mt-2.5 flex justify-between text-[12px] text-slate-500">
        <span>Billigere</span>
        <span>Typisk {kr(basis.median)}/m²</span>
        <span>Dyrere</span>
      </div>
    </div>
  );
}

function Money({ home, d, household, onHousehold, expected }: { home: BuyerHome; d: Detail | null; household: Household; onHousehold: (h: Household) => void; expected: number }) {
  const rate = d?.rates?.household.fixed ?? 4.5;
  const [downPct, setDownPct] = useState(5);
  const [owner, setOwner] = useState(() => defaultOwnerCost(home.type, home.area, home.price));
  useEffect(() => { setOwner(defaultOwnerCost(home.type, home.area, home.price)); setDownPct(5); }, [home.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const f = useMemo(() => financing(home.price, { downPct, mortgageRate: rate, ownerCost: owner, couple: household.couple }), [home.price, downPct, rate, owner, household.couple]);
  const cap = household.income ? capacity(household.income, household.savings ?? 0, household.debt ?? 0) : null;
  // Friværdi starts from what you pay: the bank values the home at the price on day one.
  const marketValue = home.price;
  const areaGap = d && d.basis.n >= 8 ? expected - home.price : 0;
  const dstGrowth = d?.trend.growth ?? null;
  const growth = Math.max(0, Math.min(3, dstGrowth ?? 2));
  const path = useMemo(() => equityPath(f, marketValue, growth, rate), [f, marketValue, growth, rate]);
  const banks = INSTITUTES.map((i) => ({ ...i, yearly: yearlyBidrag(home.price, f.mortgage, i.bands) })).sort((a, b) => a.yearly - b.yearly);
  const cheapest = banks[0], dearest = banks[banks.length - 1];
  const numIn = (v: number | null, set: (n: number | null) => void, label: string, id: string) => (
    <label htmlFor={id} className="block">
      <span className="text-[13px] font-medium text-slate-600">{label}</span>
      <div className="relative mt-1">
        <input id={id} inputMode="numeric" value={v == null ? "" : v.toLocaleString("da-DK")} onChange={(e) => { const n = Number(e.target.value.replace(/\D/g, "")); set(e.target.value.trim() === "" ? null : n); }}
          className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 pr-10 text-[16px] tabular-nums focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="0" />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-slate-400">kr</span>
      </div>
    </label>
  );
  return (
    <>
      <Section icon={<Landmark size={18} />} title="Hvad koster den om måneden?" lead={`Med ${pct(downPct, 0)} i udbetaling, fastforrentet realkreditlån og banklån. Rente ${pct(rate)} inkl. bidrag (${d?.rates ? `Nationalbanken, ${d.rates.label}` : "skøn"}), banklån ${pct(BANK_RATE)}.`}>
        <div className="rounded-2xl bg-slate-900 p-5 text-white">
          <p className="text-[13px] text-white/60">Pr. måned efter rentefradrag</p>
          <p className="mt-1 text-[32px] font-semibold tabular-nums tracking-[-0.02em]">{kr(f.monthlyNet)}</p>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[14px]">
            <dt className="text-white/60">Realkreditlån ({mio(f.mortgage)})</dt><dd className="text-right tabular-nums">{kr(f.mortgagePay)}</dd>
            <dt className="text-white/60">Banklån ({mio(f.bank)})</dt><dd className="text-right tabular-nums">{kr(f.bankPay)}</dd>
            <dt className="text-white/60">Ejerudgift (skøn)</dt><dd className="text-right tabular-nums">{kr(f.ownerCost)}</dd>
            <dt className="text-white/60">Rentefradrag</dt><dd className="text-right tabular-nums text-emerald-300">−{kr(f.deductionMonthly)}</dd>
          </dl>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="flex justify-between text-[13px] font-medium text-slate-600"><span>Udbetaling</span><span className="tabular-nums text-slate-900">{pct(downPct, 0)} · {kr(f.down)}</span></span>
            <input type="range" min={5} max={50} step={1} value={downPct} onChange={(e) => setDownPct(Number(e.target.value))} className="mt-3 w-full accent-blue-600" />
          </label>
          {numIn(owner, (n) => setOwner(n ?? 0), "Ejerudgift pr. måned (står i salgsopstillingen)", "own-cost")}
        </div>
        <p className="mt-3 text-[14px] text-slate-600">Kontant ved køb: <b className="tabular-nums">{kr(f.cashNeeded)}</b> ({kr(f.down)} i udbetaling og {kr(f.costs)} til tinglysning og rådgiver).</p>
      </Section>

      <Section icon={<Landmark size={18} />} title="Hvad kan du låne?" lead={`Bankerne ser særligt på, om din samlede gæld bliver over ${DEBT_FACTOR} gange husstandens indkomst før skat, og du skal selv have mindst 5 % i udbetaling.`}>
        <div className="grid gap-3 sm:grid-cols-3">
          {numIn(household.income, (n) => onHousehold({ ...household, income: n }), "Indkomst før skat, om året", "hh-inc")}
          {numIn(household.savings, (n) => onHousehold({ ...household, savings: n }), "Opsparing", "hh-sav")}
          {numIn(household.debt, (n) => onHousehold({ ...household, debt: n }), "Anden gæld (bil, SU)", "hh-debt")}
        </div>
        <label className="mt-3 flex min-h-[40px] items-center gap-2 text-[15px] text-slate-700"><input type="checkbox" checked={household.couple} onChange={(e) => onHousehold({ ...household, couple: e.target.checked })} className="h-4 w-4 accent-blue-600" /> Vi køber sammen (to indkomster lagt sammen)</label>
        {cap ? (
          <div className={`mt-3 rounded-xl p-4 ${cap.maxPrice >= home.price ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>
            <p className="text-[15px]">Du kan købe for op til ca. <b className="tabular-nums">{kr(Math.floor(cap.maxPrice / 10000) * 10000)}</b>.</p>
            <p className="mt-1 text-[14px] leading-relaxed">{cap.maxPrice >= home.price ? "Denne bolig ligger inden for, hvad banken normalt vil låne dig." : cap.limitedBy === "opsparing" ? `Din opsparing rækker ikke til 5 % i udbetaling og omkostninger. Du mangler ca. ${kr(f.cashNeeded - (household.savings ?? 0))}.` : `Boligen kræver mere gæld end ${DEBT_FACTOR} gange din indkomst. Banken vil se nøje på dit rådighedsbeløb.`}</p>
          </div>
        ) : <p className="mt-3 text-[14px] text-slate-500">Skriv din indkomst, så regner vi det ud. Tallene gemmes kun på din konto.</p>}
      </Section>

      <Section icon={<Landmark size={18} />} title="Hvor låner du billigst?" lead={`Renten på et realkreditlån er den samme hos alle institutter, fordi lånet finansieres med obligationer. Forskellen er bidraget. Her er bidraget på dit lån på ${mio(f.mortgage)} (${INSTITUTES_AS_OF}).`}>
        <ul className="space-y-2">
          {banks.map((b, i) => (
            <li key={b.name} className={`flex items-center gap-3 rounded-xl border p-3.5 ${i === 0 ? "border-emerald-300 bg-emerald-50/60" : "border-slate-200"}`}>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">{b.name}{i === 0 && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">Billigst</span>}</span>
                <span className="block text-[13px] text-slate-500">{b.via}</span>
              </span>
              <span className="text-right"><span className="block text-[15px] font-semibold tabular-nums">{kr(b.yearly / 12)}/md.</span><span className="text-[12px] text-slate-500 tabular-nums">{kr(b.yearly)} om året</span></span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[14px] leading-relaxed text-slate-600">{cheapest.name} er {kr(dearest.yearly - cheapest.yearly)} billigere om året end {dearest.name} på dette lån. Bidraget er det samme i hele landet, men i områder med få handler kræver nogle banker større udbetaling. Spørg altid to banker om et samlet tilbud, også på banklånet. <a href={cheapest.url} target="_blank" rel="noopener" className="font-medium text-blue-700 hover:underline">Se {cheapest.name}s prisblad</a>.</p>
      </Section>

      <Section icon={<TrendingUp size={18} />} title="Din friværdi" lead={`Boligens værdi minus restgælden. Værdien starter i købsprisen og stiger med ${pct(growth)} om året${dstGrowth != null ? ` (salgspriserne i ${d?.trend.region} er steget ${pct(dstGrowth)} om året de seneste 10 år, så vi regner forsigtigt med højst 3 %)` : ""}. Den stiplede linje er, hvis priserne står stille.`}>
        <div className="grid grid-cols-3 gap-2.5">
          {[0, 5, 10].map((y) => (
            <div key={y} className="rounded-xl bg-slate-50 p-3">
              <p className="text-[12px] font-medium text-slate-500">{y === 0 ? "Ved køb" : `Om ${y} år`}</p>
              <p className={`mt-1 text-[18px] font-semibold tabular-nums ${path[y].equity < 0 ? "text-rose-700" : "text-slate-900"}`}>{mio(path[y].equity)}</p>
              {y > 0 && <p className="text-[12px] text-slate-500 tabular-nums">{mio(path[y].equityFlat)} uden prisstigning</p>}
            </div>
          ))}
        </div>
        {areaGap > 50_000 && <p className="mt-3 rounded-xl bg-emerald-50 p-3.5 text-[14px] leading-relaxed text-emerald-900">Koster boligen det samme som lignende boliger i nærheden, er den ca. <b>{kr(areaGap)}</b> mere værd, end du betaler. Det er ikke regnet med ovenfor.</p>}
        <div className="mt-4 h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={path.map((p) => ({ år: p.year, Friværdi: Math.round(p.equity), "Uden prisstigning": Math.round(p.equityFlat) }))} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
              <defs><linearGradient id="eq" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity={0.3} /><stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} /></linearGradient></defs>
              <CartesianGrid stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="år" tickFormatter={(v) => (v === 0 ? "Nu" : `${v} år`)} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => mio(v).replace(" kr", "")} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} width={58} />
              <Tooltip formatter={(v) => kr(Number(v))} labelFormatter={(v) => (v === 0 ? "Ved køb" : `Om ${v} år`)} />
              <Area type="monotone" dataKey="Friværdi" stroke="#2563eb" strokeWidth={2.5} fill="url(#eq)" />
              <Area type="monotone" dataKey="Uden prisstigning" stroke="#94a3b8" strokeDasharray="5 4" strokeWidth={2} fill="none" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Section>
    </>
  );
}

function Plans({ plans, onShowPlans }: { plans: (Plan & { kind: string })[]; onShowPlans: () => void }) {
  const [all, setAll] = useState(false);
  if (!plans.length) return <p className="text-[15px] text-slate-600">Ingen nye lokalplaner inden for 2 km de seneste 3 år. Området ændrer sig ikke meget lige nu.</p>;
  const housing = plans.filter((p) => /bolig/i.test(p.kind)).length;
  const shown = all ? plans : plans.slice(0, 5);
  return (
    <>
      <p className="text-[15px] leading-relaxed text-slate-700"><b>{plans.length} {plans.length === 1 ? "lokalplan" : "lokalplaner"}</b> i nærheden{housing ? `, heraf ${housing} med nye boliger` : ""}. {plans.length >= 10 ? "Et område i vækst: der bygges meget, og der kommer flere indbyggere." : plans.length >= 4 ? "Der sker en del i området." : "Lidt aktivitet i området."}</p>
      <ul className="mt-3 space-y-2">
        {shown.map((p) => (
          <li key={p.id} className="rounded-xl border border-slate-200 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-violet-700">{p.status === "forslag" ? "Forslag i høring" : "Vedtaget"} · {fmtMonth(p.adopted ?? p.proposed)} · {p.distanceM != null ? (p.distanceM < 1000 ? `${Math.round(p.distanceM / 10) * 10} m` : `${(p.distanceM / 1000).toFixed(1).replace(".", ",")} km`) : ""} væk</p>
            <p className="mt-1 text-[15px] font-semibold leading-snug text-slate-900">{p.name}</p>
            <p className="text-[13px] text-slate-500">{p.kind}{p.district ? `, ${p.district}` : ""}</p>
            {p.link && <a href={p.link} target="_blank" rel="noopener" className="mt-1.5 inline-flex min-h-[32px] items-center gap-1 text-[14px] font-semibold text-blue-700 hover:underline"><FileText size={14} /> Læs planen</a>}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        {plans.length > 5 && <button type="button" onClick={() => setAll(!all)} className="min-h-[40px] rounded-lg border border-slate-300 px-3.5 text-[14px] font-semibold text-slate-700 hover:border-slate-400">{all ? "Vis færre" : `Vis alle ${plans.length}`}</button>}
        <button type="button" onClick={onShowPlans} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 text-[14px] font-semibold text-white hover:bg-violet-500"><MapPinned size={15} /> Vis på kortet</button>
      </div>
    </>
  );
}

const fmtMonth = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("da-DK", { month: "short", year: "numeric" }) : "");

function News({ slug, name }: { slug: string; name: string }) {
  const [n, setN] = useState<AreaNews | null | "loading" | "idle">("idle");
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
      <Section icon={<Newspaper size={18} />} title={`Nyt fra ${name}`} lead="Byggeri, butikker, infrastruktur og arbejdspladser fra lokale medier og kommunen. Hvert punkt har sin kilde.">
        {n === "idle" || n === "loading" ? (
          <div className="flex items-center gap-2 text-[14px] text-slate-500"><Loader2 size={16} className="animate-spin" /> Læser lokale nyheder om {name}. Det tager op til et minut første gang.</div>
        ) : !n ? (
          <p className="text-[14px] text-slate-500">Nyhederne kunne ikke hentes lige nu.</p>
        ) : (
          <>
            {n.summary && <p className="rounded-xl bg-slate-50 p-4 text-[15px] leading-relaxed text-slate-700"><b className={n.outlook === "vaekst" ? "text-emerald-700" : n.outlook === "tilbagegang" ? "text-rose-700" : "text-slate-900"}>{n.outlook === "vaekst" ? "Kommune i vækst. " : n.outlook === "tilbagegang" ? "Kommune under pres. " : ""}</b>{n.summary}</p>}
            <ul className="mt-3 space-y-3">
              {n.items.map((i) => (
                <li key={i.url + i.title} className="flex gap-3">
                  <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${i.effect === "positiv" ? "bg-emerald-500" : i.effect === "negativ" ? "bg-rose-500" : "bg-slate-300"}`} />
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold leading-snug text-slate-900">{i.title}</span>
                    {i.what && <span className="mt-0.5 block text-[14px] leading-relaxed text-slate-600">{i.what}</span>}
                    <a href={i.url} target="_blank" rel="noopener nofollow" className="mt-0.5 inline-flex items-center gap-1 text-[13px] font-medium text-blue-700 hover:underline">{i.source}{i.date ? `, ${i.date}` : ""} <ExternalLink size={12} /></a>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] text-slate-400">Samlet af AI fra nettet {new Date(n.checkedAt).toLocaleDateString("da-DK")}. Læs kilden, før du lægger vægt på et punkt.</p>
          </>
        )}
      </Section>
    </div>
  );
}

function Records({ dos, price }: { dos: { dossier: Dossier | null; burdens: FutureBurdens | null } | "loading" | null; price: number }) {
  if (dos === "loading") return <div className="flex items-center gap-2 text-[14px] text-slate-500"><Loader2 size={16} className="animate-spin" /> Henter fra BBR og Vurderingsstyrelsen …</div>;
  const d = dos?.dossier;
  const b = dos?.burdens;
  if (!d && !b) return <p className="text-[14px] text-slate-500">Vi kunne ikke slå adressen op i registrene. Det sker for nogle lejligheder og nybyggeri.</p>;
  const rows: [string, string][] = [];
  if (d?.valuation?.propertyValue) rows.push([`Offentlig ejendomsværdi (${d.valuation.year})`, `${kr(d.valuation.propertyValue)}${price ? `, prisen er ${Math.round((price / d.valuation.propertyValue) * 100)} % af den` : ""}`]);
  if (d?.valuation?.landValue) rows.push(["Grundværdi", kr(d.valuation.landValue)]);
  if (d?.landTax) rows.push([`Grundskyld ${d.landTax.year}`, `${kr(d.landTax.annual)} om året (${String(d.landTax.promille).replace(".", ",")} ‰)`]);
  if (d?.building?.builtYear) rows.push(["Opført", `${d.building.builtYear}${d.building.renovatedYear ? `, ombygget ${d.building.renovatedYear}` : ""}`]);
  if (d?.building?.roof) rows.push(["Tag", d.building.roof]);
  if (d?.building?.wall) rows.push(["Ydervægge", d.building.wall]);
  if (d?.building?.heating) rows.push(["Opvarmning", [d.building.heating, d.building.fuel].filter(Boolean).join(", ")]);
  const burdens = (b?.burdens ?? []).filter((x, i, all) => x.severity === "burden" && all.findIndex((y) => y.title === x.title) === i);
  return (
    <>
      {rows.length > 0 && (
        <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {rows.map(([k, v]) => <div key={k} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 px-4 py-2.5 text-[14px]"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>)}
        </dl>
      )}
      {(d?.risks ?? []).map((r) => <p key={r.title} className={`mt-3 rounded-xl p-3.5 text-[14px] leading-relaxed ${r.level === "hoej" ? "bg-rose-50 text-rose-900" : "bg-amber-50 text-amber-900"}`}><b>{r.title}.</b> {r.note}</p>)}
      {burdens.map((x) => <p key={x.title} className="mt-3 rounded-xl bg-amber-50 p-3.5 text-[14px] leading-relaxed text-amber-900"><b>{x.title}.</b> {x.detail}</p>)}
      {d?.valuation?.propertyValue && <p className="mt-3 text-[13px] leading-relaxed text-slate-500">Den offentlige vurdering bruges til boligskatten og er ofte lavere end handelsprisen. En pris langt over vurderingen er ikke i sig selv et faresignal, men spørg ind til den.</p>}
    </>
  );
}


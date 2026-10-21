"use client";
/* eslint-disable @next/next/no-img-element -- listing photos come from the portals' own image CDN */

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ArrowRight, Bell, Building2, Heart, Landmark, Map as MapIcon, MapPinned, Newspaper, Sparkles, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { PasswordForm } from "@/components/app/PasswordForm";
import type { BuyerHome } from "@/lib/buyer/market";
import { TYPE_LABEL } from "@/lib/buyer/market";
import type { Plan } from "@/lib/buyer/plans";
import { compare, hasFilters } from "@/lib/buyer/filter";
import { capacity, financing } from "@/lib/buyer/finance";
import { STAGES, type BuyerState, type Household, type SavedHome } from "@/lib/buyer/state";
import { MUNICIPALITIES } from "@/lib/kommuner";
import { News } from "./HomeDetail";
import { kr, mio, MailToggle, pct, useImages, VerdictPill } from "./ui";

/*
 * The buyer's dashboard: everything that matters for the area they are
 * looking at, on one page. The market right now, their own budget and what
 * it buys here, their saved homes, the best buys, what is being built and
 * what the local news says. Every block leads straight back to the map.
 */

const KOMMUNE_NAME = new Map(MUNICIPALITIES.map((m) => [m.slug, m.name]));
const WEEK = 7 * 86400_000;

type Area = { plans: (Plan & { kind: string })[]; trend: { growth: number | null; yoy: number | null; region: string }; rate: { fixed: number; variable: number; label: string } | null };

type Props = {
  state: BuyerState;
  inView: BuyerHome[];
  byId: Map<string, BuyerHome>;
  center: { lat: number; lon: number } | null;
  account: { email: string; name: string | null } | null;
  preview: boolean;
  focusPassword: boolean;
  onHousehold: (h: Household) => void;
  onSaved: (s: SavedHome[]) => void;
  onMail: (m: BuyerState["mail"]) => void;
  onOpen: (id: string) => void;
  onMap: () => void;
  onShowIds: (ids: string[]) => void;
  onBudget: (max: number) => void;
  onGood: () => void;
  onPlans: () => void;
  onTour: () => void;
  nav: React.ReactNode;
};

const Card = ({ title, icon, children, className = "", action }: { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string; action?: React.ReactNode }) => (
  <section className={`min-w-0 rounded-3xl bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-20px_rgba(15,23,42,0.22)] ring-1 ring-slate-200/70 sm:p-6 ${className}`}>
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.01em] text-slate-900"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700">{icon}</span>{title}</h2>
      {action}
    </div>
    <div className="mt-4">{children}</div>
  </section>
);

export function Dashboard(p: Props) {
  const { state, inView, byId, center } = p;
  const [area, setArea] = useState<Area | null>(null);

  // The kommune the person is mostly looking at.
  const kommune = useMemo(() => {
    const count = new Map<string, number>();
    for (const h of inView) if (h.kommune) count.set(h.kommune, (count.get(h.kommune) ?? 0) + 1);
    return Array.from(count).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }, [inView]);
  const place = kommune ? KOMMUNE_NAME.get(kommune) ?? kommune : null;
  const wide = inView.length > 3000;

  useEffect(() => {
    if (!center || wide) { setArea(null); return; }
    let live = true;
    fetch(`/api/boligkoeb/area?lat=${center.lat.toFixed(4)}&lon=${center.lon.toFixed(4)}${kommune ? `&kommune=${kommune}` : ""}`).then((r) => r.json()).then((j) => live && j.ok && setArea(j)).catch(() => {});
    return () => { live = false; };
  }, [center?.lat.toFixed(2), center?.lon.toFixed(2), kommune, wide]); // eslint-disable-line react-hooks/exhaustive-deps

  const now = Date.now();
  const fresh = inView.filter((h) => h.knownStart && now - Date.parse(h.firstSeen) < WEEK);
  const good = inView.filter((h) => h.verdict === "godt" && !h.suspect);
  const cut = inView.filter((h) => h.cutPct > 0);
  const ppm = inView.map((h) => h.ppm).sort((a, b) => a - b);
  const top = [...good].sort(compare("bedste")).slice(0, 6);
  const first = p.account?.name?.split(" ")[0];
  const hour = new Date().getHours();
  const hello = hour < 10 ? "Godmorgen" : hour < 18 ? "Goddag" : "Godaften";

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#f4f6f9]">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <Image src="/nordinvest-logo.png" alt="" width={30} height={30} className="object-contain mix-blend-multiply" />
        <p className="flex-1 text-[17px] font-semibold tracking-[-0.01em]">Overblik</p>
        <button type="button" onClick={p.onMap} className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-900 px-4 text-[14px] font-semibold text-white hover:bg-slate-800"><MapIcon size={17} /> Til kortet</button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-32 lg:pb-12">
        <div className="mx-auto grid max-w-[1180px] gap-4 px-3 pt-4 sm:gap-5 sm:px-6 sm:pt-6 lg:grid-cols-3">
          {/* The area right now */}
          <section className="min-w-0 rounded-3xl bg-slate-900 p-5 text-white sm:p-7 lg:col-span-3">
            <p className="text-[14px] text-white/60">{hello}{first ? `, ${first}` : ""}</p>
            <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-[-0.025em] sm:text-[34px]">
              {wide ? "Hele Danmark lige nu" : place ? `${place} og omegn lige nu` : "Dit område lige nu"}
            </h1>
            <p className="mt-1 text-[15px] text-white/60">{wide ? "Zoom ind på kortet for at se tallene for et område." : "Tallene følger det udsnit, du kigger på på kortet, med dine filtre."}</p>
            <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {([
                ["Til salg", inView.length.toLocaleString("da-DK"), "text-white"],
                ["Gode køb", good.length.toLocaleString("da-DK"), "text-emerald-300"],
                ["Nye i ugen", fresh.length.toLocaleString("da-DK"), "text-sky-300"],
                ["Sat ned", inView.length ? `${Math.round((cut.length / inView.length) * 100)} %` : "–", "text-white"],
                ["Typisk m²-pris", ppm.length ? kr(ppm[Math.floor(ppm.length / 2)]) : "–", "text-white"],
              ] as const).map(([l, v, c]) => (
                <div key={l} className="rounded-2xl bg-white/[0.07] p-3.5 ring-1 ring-white/10 last:col-span-2 sm:last:col-span-1"><dt className="text-[12px] font-medium text-white/55">{l}</dt><dd className={`mt-1 text-[22px] font-semibold tabular-nums tracking-[-0.01em] ${c}`}>{v}</dd></div>
              ))}
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              {good.length > 0 && <button type="button" onClick={p.onGood} className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-emerald-500 px-4 text-[14px] font-semibold text-white hover:bg-emerald-400"><span className="h-2.5 w-2.5 rounded-full bg-white" /> Vis de {good.length.toLocaleString("da-DK")} gode køb</button>}
              {fresh.length > 0 && <button type="button" onClick={() => p.onShowIds(fresh.map((h) => h.id))} className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white/10 px-4 text-[14px] font-semibold text-white ring-1 ring-white/20 hover:bg-white/15"><Sparkles size={16} /> Vis de {fresh.length} nye</button>}
            </div>
          </section>

          <Budget household={state.household} onHousehold={p.onHousehold} inView={inView} rate={area?.rate?.fixed ?? 4.5} onBudget={p.onBudget} />

          <Saved saved={state.saved} byId={byId} onOpen={p.onOpen} onSaved={p.onSaved} onMap={p.onMap} />

          <Card title="Bedste køb i området" icon={<TrendingDown size={17} />} className="lg:col-span-2" action={good.length > 6 ? <button type="button" onClick={p.onGood} className="text-[14px] font-semibold text-blue-700 hover:underline">Se alle</button> : undefined}>
            {top.length ? <TopGrid homes={top} onOpen={p.onOpen} /> : <p className="text-[15px] text-slate-500">Ingen gode køb i udsnittet med dine filtre. Flyt kortet eller løsn et filter.</p>}
          </Card>

          <Card title="Området udvikler sig" icon={<Building2 size={17} />}>
            {wide ? <p className="text-[15px] text-slate-500">Zoom ind på kortet, så viser vi byggeprojekter og prisudvikling for området.</p> : !area ? <div className="h-40 animate-pulse rounded-2xl bg-slate-100" /> : <AreaBlock area={area} onPlans={p.onPlans} />}
          </Card>

          {kommune && !wide && <Card title={`Nyt fra ${place ?? kommune}`} icon={<Newspaper size={17} />} className="lg:col-span-2"><News slug={kommune} name={place ?? kommune} max={4} /></Card>}

          <Card title="Besked og konto" icon={<Bell size={17} />} className={kommune && !wide ? "" : "lg:col-span-3"}>
            <div className="space-y-2.5">
              <MailToggle label="Nye boliger i mit område" sub={hasFilters(state.filters) ? "Én mail om dagen, når der kommer nye boliger, der passer på dine filtre." : "Vælg først et filter på kortet, fx pris eller boligtype."} on={state.mail.newMatches} onChange={(v) => p.onMail({ ...state.mail, newMatches: v })} />
              <MailToggle label="Prisfald og salg på gemte" on={state.mail.priceDrops} onChange={(v) => p.onMail({ ...state.mail, priceDrops: v })} />
            </div>
            {p.account && <p className="mt-4 truncate text-[14px] text-slate-500">{p.account.email}</p>}
            {!p.preview && <div className="mt-3"><PasswordForm focus={p.focusPassword} /></div>}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={p.onTour} className="min-h-[44px] rounded-full border border-slate-300 px-4 text-[14px] font-semibold hover:border-slate-400">Se guiden igen</button>
              <a href="mailto:contact@nordinvest.io" className="inline-flex min-h-[44px] items-center rounded-full border border-slate-300 px-4 text-[14px] font-semibold hover:border-slate-400">Skriv til os</a>
              {!p.preview && <form action="/auth/signout" method="post"><button type="submit" className="min-h-[44px] rounded-full px-4 text-[14px] font-semibold text-slate-600 hover:bg-slate-100">Log ud</button></form>}
            </div>
          </Card>
        </div>
      </div>
      {p.nav}
    </div>
  );
}

function Budget({ household, onHousehold, inView, rate, onBudget }: { household: Household; onHousehold: (h: Household) => void; inView: BuyerHome[]; rate: number; onBudget: (max: number) => void }) {
  const cap = household.income ? capacity(household.income, household.savings ?? 0, household.debt ?? 0) : null;
  const max = cap ? Math.floor(cap.maxPrice / 10_000) * 10_000 : 0;
  const within = cap ? inView.filter((h) => h.price <= max) : [];
  const goodWithin = within.filter((h) => h.verdict === "godt" && !h.suspect).length;
  const f = cap && max > 0 ? financing(max, { mortgageRate: rate, ownerCost: 3000, couple: household.couple }) : null;
  const field = (label: string, v: number | null, set: (n: number | null) => void) => (
    <label className="block min-w-0">
      <span className="text-[12px] font-medium text-slate-500">{label}</span>
      <input inputMode="numeric" value={v == null ? "" : v.toLocaleString("da-DK")} placeholder="0" onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); set(d ? Number(d) : null); }}
        className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[16px] tabular-nums focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" />
    </label>
  );
  return (
    <Card title="Din boligøkonomi" icon={<Wallet size={17} />}>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="col-span-2">{field("Husstandens indkomst før skat, om året", household.income, (n) => onHousehold({ ...household, income: n }))}</div>
        {field("Opsparing", household.savings, (n) => onHousehold({ ...household, savings: n }))}
        {field("Anden gæld", household.debt, (n) => onHousehold({ ...household, debt: n }))}
      </div>
      {cap && f ? (
        <div className="mt-4 rounded-2xl bg-blue-50 p-4">
          <p className="text-[13px] font-medium text-blue-900/70">Du kan købe for op til</p>
          <p className="mt-0.5 text-[26px] font-semibold tabular-nums tracking-[-0.02em] text-blue-950">{mio(max)}</p>
          <p className="mt-1 text-[14px] text-blue-900/80">Ca. {kr(f.monthlyNet)} om måneden efter fradrag. {cap.limitedBy === "opsparing" ? "Opsparingen sætter grænsen." : "Indkomsten sætter grænsen."}</p>
          <p className="mt-3 text-[14px] text-slate-700"><b className="tabular-nums">{within.length.toLocaleString("da-DK")}</b> boliger i området er inden for budgettet, <b className="tabular-nums text-emerald-700">{goodWithin.toLocaleString("da-DK")}</b> af dem er gode køb.</p>
          <button type="button" onClick={() => onBudget(max)} className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-blue-600 text-[15px] font-semibold text-white hover:bg-blue-500">Vis dem på kortet <ArrowRight size={16} /></button>
        </div>
      ) : (
        <p className="mt-4 text-[14px] leading-relaxed text-slate-500">Skriv jeres indkomst, så ser I, hvad I kan købe for, og hvilke boliger i området der passer. Tallene gemmes kun på din konto.</p>
      )}
    </Card>
  );
}

function Saved({ saved, byId, onOpen, onSaved, onMap }: { saved: SavedHome[]; byId: Map<string, BuyerHome>; onOpen: (id: string) => void; onSaved: (s: SavedHome[]) => void; onMap: () => void }) {
  const images = useImages(saved.slice(0, 8).map((s) => s.id));
  return (
    <Card title={`Gemte boliger${saved.length ? ` (${saved.length})` : ""}`} icon={<Heart size={17} />} className="lg:col-span-2 lg:self-start">
      {!saved.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center">
          <p className="text-[16px] font-semibold text-slate-800">Ingen gemte boliger endnu</p>
          <p className="mx-auto mt-1 max-w-sm text-[14px] text-slate-500">Tryk på hjertet på en bolig. Så holder vi øje med prisen for dig.</p>
          <button type="button" onClick={onMap} className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-900 px-4 text-[14px] font-semibold text-white"><MapIcon size={16} /> Find boliger på kortet</button>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {saved.slice(0, 8).map((s) => {
            const h = byId.get(s.id);
            const diff = h ? h.price - s.price : 0;
            return (
              <li key={s.id} className="flex items-center gap-3 py-2.5">
                <button type="button" disabled={!h} onClick={() => onOpen(s.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default">
                  <span className="h-14 w-[72px] shrink-0 overflow-hidden rounded-xl bg-slate-100">{images.get(s.id) && <img src={images.get(s.id)!} alt="" className="h-full w-full object-cover" />}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold text-slate-900">{s.address.split(",")[0]}</span>
                    {(s.stage || s.note) && <span className="block truncate text-[12px] text-slate-500">{s.stage && <b className="mr-1.5 rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">{STAGES.find((x) => x.id === s.stage)?.label}</b>}{s.note}</span>}
                    {h ? <span className="block text-[14px] tabular-nums text-slate-600">{mio(h.price)}{diff !== 0 && <span className={diff < 0 ? "font-semibold text-emerald-700" : "text-rose-700"}> · {diff < 0 ? "−" : "+"}{kr(Math.abs(diff))}</span>}</span> : <span className="block text-[14px] text-slate-500">Ikke længere til salg</span>}
                  </span>
                </button>
                {h && <span className="hidden sm:block"><VerdictPill v={h.verdict} /></span>}
                <button type="button" onClick={() => onSaved(saved.map((x) => (x.id === s.id ? { ...x, alert: !x.alert } : x)))} aria-pressed={s.alert} aria-label={s.alert ? "Slå besked fra" : "Slå besked til"} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${s.alert ? "bg-blue-50 text-blue-700" : "text-slate-400 hover:bg-slate-100"}`}><Bell size={17} /></button>
              </li>
            );
          })}
        </ul>
      )}
      {saved.length > 0 && saved.length < 4 && <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-[14px] text-slate-600">Bjælden betyder, at du får en mail, hvis prisen falder, eller boligen bliver solgt.</p>}
    </Card>
  );
}

function TopGrid({ homes, onOpen }: { homes: BuyerHome[]; onOpen: (id: string) => void }) {
  const images = useImages(homes.map((h) => h.id));
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {homes.map((h) => (
        <li key={h.id}>
          <button type="button" onClick={() => onOpen(h.id)} className="group block w-full overflow-hidden rounded-2xl text-left ring-1 ring-slate-200 transition-shadow hover:shadow-[0_10px_30px_-12px_rgba(15,23,42,0.35)]">
            <span className="relative block aspect-[16/10] bg-slate-100">
              {images.get(h.id) && <img src={images.get(h.id)!} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />}
              <span className="absolute left-2 top-2"><VerdictPill v={h.verdict} /></span>
            </span>
            <span className="block p-3">
              <span className="block text-[17px] font-semibold tabular-nums">{mio(h.price)}</span>
              <span className="block truncate text-[14px] text-slate-600">{h.address.split(",")[0]}</span>
              <span className="mt-0.5 block text-[13px] text-slate-500">{TYPE_LABEL[h.type] ?? ""} · {h.area} m² · <span className="font-medium text-emerald-700">{pct(Math.abs(h.deltaPct), 0)} under</span></span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function AreaBlock({ area, onPlans }: { area: Area; onPlans: () => void }) {
  const housing = area.plans.filter((x) => /bolig/i.test(x.kind)).length;
  return (
    <>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-slate-50 p-3.5"><p className="text-[12px] font-medium text-slate-500">Prisudvikling, 1 år</p><p className={`mt-1 flex items-center gap-1 text-[20px] font-semibold tabular-nums ${area.trend.yoy != null && area.trend.yoy < 0 ? "text-rose-700" : "text-emerald-700"}`}>{area.trend.yoy != null ? <>{area.trend.yoy >= 0 ? <TrendingUp size={17} /> : <TrendingDown size={17} />}{area.trend.yoy > 0 ? "+" : ""}{pct(area.trend.yoy)}</> : "–"}</p><p className="text-[12px] text-slate-500">{area.trend.region}</p></div>
        <div className="rounded-2xl bg-slate-50 p-3.5"><p className="text-[12px] font-medium text-slate-500">Nye lokalplaner</p><p className="mt-1 text-[20px] font-semibold tabular-nums">{area.plans.length}</p><p className="text-[12px] text-slate-500">{housing} med boliger, 3 km</p></div>
      </div>
      {area.rate && <p className="mt-3 flex items-center gap-2 text-[14px] text-slate-600"><Landmark size={15} className="text-slate-400" /> Fast rente på nye boliglån: <b className="tabular-nums text-slate-900">{pct(area.rate.fixed)}</b> ({area.rate.label})</p>}
      <p className="mt-3 text-[14px] leading-relaxed text-slate-600">{area.plans.length >= 10 ? "Der bygges meget her. Nye boliger og butikker trækker flere indbyggere til, og det plejer at holde priserne oppe." : area.plans.length >= 4 ? "Der sker en del i området." : "Området ændrer sig ikke meget lige nu."}</p>
      <ul className="mt-3 space-y-2">
        {area.plans.slice(0, 4).map((x) => (
          <li key={x.id} className="flex gap-2.5 text-[14px]">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-sm" style={{ background: x.status === "forslag" ? "#7c3aed" : "#6366f1" }} />
            <span className="min-w-0"><span className="block truncate font-medium text-slate-800">{x.name}</span><span className="text-[12px] text-slate-500">{x.kind} · {x.status === "forslag" ? "forslag" : "vedtaget"}</span></span>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onPlans} className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-violet-600 text-[14px] font-semibold text-white hover:bg-violet-500"><MapPinned size={16} /> Se projekterne på kortet</button>
    </>
  );
}


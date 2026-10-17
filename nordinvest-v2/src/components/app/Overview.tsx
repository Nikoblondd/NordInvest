"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Gavel, Plus, Search } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { OFFER_STATUS, STAGES, STAGE_LABEL, type Stage } from "@/lib/mappe/checklist";
import { KIND, addDays, clock, dayOf, mappeOf, street, timeOf, ymd } from "@/lib/app/calendar";
import type { CalEvent } from "@/lib/app/events";
import type { Agent, Hit } from "@/lib/app/agents";
import type { CrmRow } from "@/components/dashboard/Crm";
import { EventDialog, type DialogState } from "./EventDialog";
import { HitCard } from "./agents/HitCard";
import { useHitActions } from "./agents/Agents";
import { ItemRow } from "./Calendar";
import { PropertyImage } from "./PropertyImage";
import { Toast, btn } from "./ui";
import { useCalendar } from "./useCalendar";
import { EMPTY_DRIFT, actualCashFlow, balance, estimatedValue, expectedRent } from "@/lib/drift";

/*
 * Overblik: the member's day, the way an operations tool opens. Today's plan
 * with times, the next seven days at a glance, what the search agents found
 * since last time, where the pipeline and the bids stand, and the properties
 * worked on most recently. New members also get "Kom i gang", which ticks
 * itself off as they use the product.
 */

export type Opportunity = { address: string; zip: number; city: string; price: number; cashFlow: number; capRate: number; image: string | null; href: string };

const BAR: Record<Stage, string> = { screening: "bg-slate-500", fremvisning: "bg-sky-500", dokumenter: "bg-amber-400", bank: "bg-indigo-500", bud: "bg-orange-500", koebt: "bg-emerald-500" };
const mio = (n: number) => (n >= 1e6 ? `${(n / 1e6).toLocaleString("da-DK", { maximumFractionDigits: 1 })} mio. kr.` : `${Math.round(n).toLocaleString("da-DK")} kr.`);
const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const addrOf = (r: CrmRow) => r.property_data?.address || r.property_url || "Bolig";
const WD = ["søn", "man", "tir", "ons", "tor", "fre", "lør"];

function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 10 ? "Godmorgen" : h < 17 ? "God dag" : "God aften";
}

export function Overview({ firstName, initial, events, agents: initialAgents, deals }: { firstName: string; initial: CrmRow[]; events: CalEvent[]; agents: Agent[]; deals: Opportunity[] }) {
  const cal = useCalendar(initial, events);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [agents, setAgents] = useState(initialAgents);
  const hitActions = useHitActions((h) => agents.find((a) => a.hits.some((x) => x.id === h.id)), (a) => setAgents((all) => all.map((x) => (x.id === a.id ? a : x))));
  const rows = cal.rows;
  const today = ymd(new Date());

  const live = rows.filter((r) => mappeOf(r).stage !== "droppet");
  const inPlay = live.filter((r) => mappeOf(r).stage !== "koebt");
  const value = inPlay.reduce((s, r) => s + (Number(r.property_data?.price) || 0), 0);
  const items = cal.items.filter((i) => i.due);
  const todays = items.filter((i) => dayOf(i.due!) === today).sort((a, b) => (timeOf(a.due) ?? "00:00").localeCompare(timeOf(b.due) ?? "00:00"));
  const late = items.filter((i) => !i.done && dayOf(i.due!) < today);
  const week = Array.from({ length: 7 }, (_, n) => {
    const d = addDays(new Date(), n + 1);
    const k = ymd(d);
    return { k, d, list: items.filter((i) => dayOf(i.due!) === k && !i.done) };
  });
  const bids = live.map((r) => ({ r, o: mappeOf(r).offer })).filter((x): x is { r: CrmRow; o: NonNullable<typeof x.o> } => !!x.o && (x.o.status === "afgivet" || x.o.status === "modbud"));
  const fresh: { a: Agent; h: Hit }[] = useMemo(() => agents.flatMap((a) => a.hits.filter((h) => h.status === "ny").map((h) => ({ a, h }))).sort((x, y) => y.h.foundAt.localeCompare(x.h.foundAt)), [agents]);
  const byStage = STAGES.filter((s) => s.id !== "koebt").map((s) => ({ ...s, n: live.filter((r) => mappeOf(r).stage === s.id).length }));
  const totalStage = byStage.reduce((a, b) => a + b.n, 0);
  const recent = [...live].sort((a, b) => (mappeOf(b).updatedAt ?? b.created_at).localeCompare(mappeOf(a).updatedAt ?? a.created_at)).slice(0, 4);
  const homes = live.map((r) => ({ id: r.id, address: addrOf(r) }));
  // Bought properties: the portfolio in running numbers.
  const owned = live.filter((r) => mappeOf(r).stage === "koebt").map((r) => ({ r, d: mappeOf(r).drift ?? EMPTY_DRIFT }));
  const port = owned.reduce((a, { d }) => {
    const act = actualCashFlow(d), debt = d.loan ? balance(d.loan) : 0, val = estimatedValue(d);
    return { rent: a.rent + expectedRent(d), cf: a.cf + (act?.avg ?? 0), hasCf: a.hasCf || !!act, equity: a.equity + (val != null ? val - debt : 0), hasEq: a.hasEq || val != null };
  }, { rent: 0, cf: 0, hasCf: false, equity: 0, hasEq: false });

  const start = [
    { done: agents.length > 0, t: "Opret en søgeagent", d: "Den holder øje med markedet og giver besked om nye boliger.", href: "/app/find/agenter" },
    { done: rows.length > 0, t: "Gem en bolig i pipelinen", d: "Fra Find boliger, en agent eller en analyse.", href: "/app/find" },
    { done: rows.some((r) => (mappeOf(r).tasks ?? []).length > 0) || events.length > 0, t: "Planlæg en fremvisning", d: "Aftaler samles i kalenderen. Du får en mail dagen før.", href: "/app/kalender" },
    { done: rows.some((r) => (mappeOf(r).docs ?? []).length > 0), t: "Gennemgå salgsdokumenter", d: "Upload salgsopstilling eller referat på en bolig.", href: rows[0] ? `/app/ejendomme/${rows[0].id}?fane=papirer` : "/app/find" },
  ];
  const startDone = start.filter((s) => s.done).length;
  const dateStr = new Date().toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long" }).replace(/^./, (c) => c.toUpperCase());

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[14px] font-medium text-slate-500">{dateStr}</p>
          <h1 className="mt-0.5 text-[26px] font-semibold leading-tight tracking-[-0.025em] sm:text-[30px]">{greeting()}{firstName ? `, ${firstName}` : ""}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setDialog({ day: today })} className={btn.secondary}><CalendarDays size={16} /> Ny aftale</button>
          <Link href="/app/find" className={btn.primary}><Search size={16} /> Find boliger</Link>
        </div>
      </div>

      {startDone < start.length && (
        <section aria-labelledby="start-h" className="mt-6 overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
            <h2 id="start-h" className="text-[17px] font-semibold">Kom i gang</h2>
            <span className="text-[13px] font-medium text-slate-500">{startDone} af {start.length} klaret</span>
          </div>
          <div className="mx-5 mt-3 h-1.5 overflow-hidden rounded-full bg-blue-100 sm:mx-6"><div className="h-full rounded-full bg-blue-600 transition-all duration-700" style={{ width: `${(startDone / start.length) * 100}%` }} /></div>
          <ol className="grid gap-px p-2 sm:grid-cols-2 lg:grid-cols-4">
            {start.map((s, i) => (
              <li key={s.t}>
                <Link href={s.href} className={clsx("flex h-full gap-3 rounded-xl p-3 transition-colors hover:bg-white", s.done && "opacity-60")}>
                  <span className={clsx("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold", s.done ? "bg-emerald-500 text-white" : "bg-white text-blue-700 ring-1 ring-blue-200")}>{s.done ? <Check size={14} strokeWidth={3} /> : i + 1}</span>
                  <span><span className={clsx("block text-[15px] font-semibold", s.done && "line-through decoration-slate-300")}>{s.t}</span><span className="mt-0.5 block text-[13px] leading-snug text-slate-500">{s.d}</span></span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Figures */}
      <div data-tour="kpis" className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="I pipelinen" value={inPlay.length} sub={value ? `${mio(value)} i alt` : "boliger, du arbejder på"} href="/app/ejendomme" />
        <Kpi label="Aftaler i dag" value={todays.filter((i) => !i.done).length} sub={late.length ? `${late.length} overskredet` : "intet overskredet"} href={`/app/kalender?dag=${today}`} tone={late.length ? "bad" : undefined} />
        <Kpi label="Bud ude" value={bids.length} sub={bids[0] ? `${street(addrOf(bids[0].r))}, ${OFFER_STATUS[bids[0].o.status].toLowerCase()}` : "ingen lige nu"} href="/app/ejendomme" />
        <Kpi label="Nye fra agenter" value={fresh.length} sub={agents.length ? `${agents.filter((a) => a.active).length} ${agents.filter((a) => a.active).length === 1 ? "agent kører" : "agenter kører"}` : "ingen agenter endnu"} href="/app/find/agenter" tone={fresh.length ? "new" : undefined} />
      </div>

      {owned.length > 0 && (
        <section aria-labelledby="port-h" className="mt-6 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="port-h" className="text-[16px] font-semibold">Din portefølje</h2>
            <span className="text-[13px] font-medium text-slate-500">{owned.length} {owned.length === 1 ? "ejendom" : "ejendomme"}</span>
          </div>
          <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div><dt className="text-[13px] text-slate-500">Husleje pr. md.</dt><dd className="text-[22px] font-semibold tabular-nums">{Math.round(port.rent).toLocaleString("da-DK")} kr.</dd></div>
            <div><dt className="text-[13px] text-slate-500">Faktisk cash flow pr. md.</dt><dd className={clsx("text-[22px] font-semibold tabular-nums", port.hasCf && (port.cf >= 0 ? "text-emerald-700" : "text-rose-600"))}>{port.hasCf ? `${port.cf >= 0 ? "+" : "−"}${Math.round(Math.abs(port.cf)).toLocaleString("da-DK")} kr.` : "–"}</dd></div>
            <div><dt className="text-[13px] text-slate-500">Friværdi (skøn)</dt><dd className="text-[22px] font-semibold tabular-nums">{port.hasEq ? `${Math.round(port.equity).toLocaleString("da-DK")} kr.` : "–"}</dd></div>
          </dl>
          <ul className="mt-3 flex flex-wrap gap-2">
            {owned.map(({ r }) => <li key={r.id}><Link href={`/app/ejendomme/${r.id}?fane=drift`} className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-white px-3 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:ring-slate-300">{street(addrOf(r))} <ArrowRight size={13} /></Link></li>)}
          </ul>
        </section>
      )}

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* Today */}
        <section data-tour="next-steps" aria-labelledby="today-h" className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <h2 id="today-h" className="text-[16px] font-semibold">Dagens plan</h2>
            <Link href="/app/kalender" className="text-[14px] font-medium text-blue-700 hover:underline">Kalender</Link>
          </div>
          {late.length + todays.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <CalendarDays className="mx-auto text-slate-300" size={28} />
              <p className="mt-2 text-[15px] font-medium text-slate-700">Intet i kalenderen i dag</p>
              <p className="mt-1 text-[14px] text-slate-500">Planlæg en fremvisning eller et bankmøde.</p>
              <button type="button" onClick={() => setDialog({ day: today })} className={clsx(btn.secondary, "mt-4")}><Plus size={15} /> Ny aftale</button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {late.slice(0, 3).map((i) => <ItemRow key={i.key} i={i} showDay onOpen={() => setDialog({ item: i })} onToggle={() => cal.toggle(i)} />)}
              {todays.map((i) => <ItemRow key={i.key} i={i} onOpen={() => setDialog({ item: i })} onToggle={() => cal.toggle(i)} />)}
            </ul>
          )}
          {/* The next seven days */}
          <div className="border-t border-slate-100 px-3 pb-3 pt-3 sm:px-4">
            <p className="px-1 pb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">De næste 7 dage</p>
            <div className="grid grid-cols-7 gap-1.5">
              {week.map(({ k, d, list }) => (
                <Link key={k} href={`/app/kalender?dag=${k}`} aria-label={`${d.toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long" })}: ${list.length} aftaler`}
                  className={clsx("flex min-h-[78px] flex-col rounded-xl border px-1.5 py-2 text-center transition-colors hover:border-slate-300", list.length ? "border-slate-200 bg-white" : "border-transparent bg-slate-50")}>
                  <span className="text-[12px] font-semibold uppercase text-slate-500">{WD[d.getDay()]}</span>
                  <span className="text-[17px] font-semibold tabular-nums text-slate-900">{d.getDate()}</span>
                  <span className="mt-auto flex justify-center gap-0.5">{list.slice(0, 4).map((i) => <span key={i.key} className={clsx("h-1.5 w-1.5 rounded-full", KIND[i.kind].dot)} />)}</span>
                  {list.length > 0 && <span className="mt-1 text-[12px] font-medium tabular-nums text-slate-600">{list.length === 1 ? (timeOf(list[0].due) ? clock(timeOf(list[0].due)!) : "1") : list.length}</span>}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Agents */}
        <section data-tour="opportunities" aria-labelledby="agents-h" className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <h2 id="agents-h" className="flex items-center gap-2 text-[16px] font-semibold">Nyt fra dine agenter {fresh.length > 0 && <span className="rounded-full bg-blue-600 px-1.5 text-[12px] font-bold text-white">{fresh.length}</span>}</h2>
            <Link href="/app/find/agenter" className="text-[14px] font-medium text-blue-700 hover:underline">Søgeagenter</Link>
          </div>
          {fresh.length > 0 ? (
            <div className="space-y-2 p-3">
              {fresh.slice(0, 3).map(({ a, h }) => <HitCard key={`${a.id}:${h.id}`} h={h} compact busy={hitActions.busy === h.id} onSave={() => hitActions.save(h)} onDismiss={() => hitActions.mark(a, h, "afvist")} />)}
              {fresh.length > 3 && <Link href="/app/find/agenter" className="flex min-h-[40px] items-center justify-center gap-1 text-[14px] font-semibold text-blue-700 hover:underline">Se alle {fresh.length} <ArrowRight size={14} /></Link>}
            </div>
          ) : agents.length === 0 ? (
            <div className="px-5 py-7">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/app/il-agent.jpg" alt="" className="mx-auto mb-1 w-full max-w-[240px]" />
              <p className="mt-1 text-[15px] font-semibold text-slate-900">Søgeagenter</p>
              <p className="mt-1 text-[14px] text-slate-500">En søgeagent gennemgår markedet efter dine kriterier og giver besked om nye boliger.</p>
              <Link href="/app/find/agenter" className={clsx(btn.primary, "mt-4")}><Plus size={15} /> Opret en søgeagent</Link>
            </div>
          ) : (
            <div>
              <p className="px-5 pt-4 text-[14px] text-slate-500">Ingen nye fund siden sidst. Dagens bedste boliger på markedet:</p>
              <ul className="divide-y divide-slate-100">
                {deals.slice(0, 3).map((d) => (
                  <li key={d.href} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg ring-1 ring-slate-200/70"><PropertyImage src={d.image} /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-semibold">{street(d.address)}</span><span className="block truncate text-[13px] text-slate-500">{d.zip} {d.city} · {kr(d.price)}</span></span>
                    <Link href={d.href} className="inline-flex h-9 shrink-0 items-center rounded-lg border border-slate-200 px-3 text-[13px] font-semibold text-slate-800 hover:border-slate-300">Analysér</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* Pipeline and bids (only once there is something in it) */}
      {live.length > 0 && <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Link href="/app/ejendomme" data-tour="pipeline" className="block rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300">
          <div className="flex items-center justify-between text-[14px]"><span className="text-[16px] font-semibold">Pipeline</span><span className="text-slate-500">{totalStage} {totalStage === 1 ? "bolig" : "boliger"} i gang</span></div>
          <div className="mt-4 flex h-3 gap-0.5 overflow-hidden rounded-full bg-slate-100">
            {totalStage > 0 && byStage.filter((s) => s.n > 0).map((s) => <span key={s.id} className={clsx("transition-all duration-700", BAR[s.id])} style={{ flex: s.n }} />)}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {byStage.map((s) => (
              <div key={s.id} className="rounded-lg bg-slate-50 px-2.5 py-2">
                <p className="flex items-center gap-1.5 truncate text-[12px] font-medium text-slate-500"><span className={clsx("h-2 w-2 rounded-full", BAR[s.id])} />{s.label}</p>
                <p className="mt-0.5 text-[18px] font-semibold tabular-nums text-slate-900">{s.n}</p>
              </div>
            ))}
          </div>
        </Link>
        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5"><h2 className="text-[16px] font-semibold">Bud</h2></div>
          {bids.length === 0 ? (
            <p className="px-5 py-6 text-[14px] text-slate-500">Ingen aktive bud. Registrerede bud, modbud og svarfrister vises her.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {bids.map(({ r, o }) => (
                <li key={r.id}>
                  <Link href={`/app/ejendomme/${r.id}?fane=bud`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600"><Gavel size={16} /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-semibold">{street(addrOf(r))}</span><span className="block truncate text-[13px] text-slate-500">{kr(o.amount)}{o.status === "modbud" && o.counter ? ` · modbud ${kr(o.counter)}` : ""}</span></span>
                    <span className={clsx("shrink-0 rounded-md px-1.5 py-0.5 text-[12px] font-semibold", o.status === "modbud" ? "bg-amber-50 text-amber-900" : "bg-blue-50 text-blue-800")}>{OFFER_STATUS[o.status]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>}

      {recent.length > 0 && (
        <section aria-labelledby="recent-h" className="mt-6">
          <div className="flex items-center justify-between">
            <h2 id="recent-h" className="text-[16px] font-semibold">Senest arbejdet med</h2>
            <Link href="/app/ejendomme" className="inline-flex items-center gap-1 text-[14px] font-medium text-blue-700 hover:underline">Alle ejendomme <ArrowRight size={14} /></Link>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((r) => {
              const m = mappeOf(r);
              const img = typeof r.property_data?.image === "string" ? r.property_data.image : null;
              const cf = r.analysis_result?.cashFlow;
              return (
                <Link key={r.id} href={`/app/ejendomme/${r.id}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-md">
                  <div className="relative h-28 bg-slate-100">
                    <PropertyImage src={img} />
                    <span className="absolute left-2.5 top-2.5 rounded-md bg-white/95 px-2 py-0.5 text-[12px] font-semibold text-slate-800 shadow-sm">{STAGE_LABEL[m.stage]}</span>
                  </div>
                  <div className="p-3.5">
                    <p className="truncate text-[15px] font-semibold group-hover:text-blue-700">{street(addrOf(r))}</p>
                    <p className="mt-0.5 flex items-center justify-between gap-2 text-[13px] text-slate-500">
                      <span className="truncate">{Number(r.property_data?.price) ? kr(Number(r.property_data?.price)) : "Ingen pris"}</span>
                      {cf != null && <span className={clsx("shrink-0 font-semibold tabular-nums", cf >= 0 ? "text-emerald-700" : "text-rose-600")}>{cf >= 0 ? "+" : "-"}{Math.round(Math.abs(cf)).toLocaleString("da-DK")}/md.</span>}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <EventDialog state={dialog} onClose={() => setDialog(null)} homes={homes} onSave={cal.save} onDelete={cal.remove} />
      {cal.error && <Toast text={cal.error} tone="bad" onClose={cal.clearError} />}
      {hitActions.toast && <Toast text={hitActions.toast.text} tone={hitActions.toast.tone} onClose={() => hitActions.setToast(null)} action={hitActions.toast.href ? <Link href={hitActions.toast.href} className="shrink-0 font-semibold text-blue-300 hover:underline">Åbn</Link> : undefined} />}
    </div>
  );
}

function Kpi({ label, value, sub, href, tone }: { label: string; value: number; sub: string; href: string; tone?: "bad" | "new" }) {
  return (
    <Link href={href} className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 sm:p-5">
      <p className="text-[13px] font-medium text-slate-500">{label}</p>
      <p className={clsx("mt-1 text-[30px] font-semibold leading-none tabular-nums tracking-[-0.03em]", tone === "new" && value > 0 && "text-blue-700")}>{value.toLocaleString("da-DK")}</p>
      <p className={clsx("mt-1.5 truncate text-[13px]", tone === "bad" ? "font-medium text-rose-600" : "text-slate-500")}>{sub}</p>
    </Link>
  );
}


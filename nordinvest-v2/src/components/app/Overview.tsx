"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Home } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { EMPTY_MAPPE, STAGES, STAGE_LABEL, daysUntil, fmtDue, type Mappe, type Stage, type Task } from "@/lib/mappe/checklist";
import { saveMappe } from "@/lib/mappe/save";
import type { CrmRow } from "@/components/dashboard/Crm";

/*
 * Overblik: the member's day in one screen. Status, the pipeline, what needs
 * doing next across every property, today's best opportunities from the
 * Deal-motor and the most recent properties. New members get a short
 * "Kom i gang" list that ticks itself off as they use the product.
 */

export type Opportunity = { address: string; zip: number; city: string; price: number; cashFlow: number; capRate: number; image: string | null; href: string };

const BAR: Record<Stage, string> = { screening: "bg-slate-400", fremvisning: "bg-sky-500", dokumenter: "bg-amber-400", bank: "bg-indigo-500", bud: "bg-orange-500", koebt: "bg-emerald-500" };
const PILL: Record<Stage | "droppet", string> = { screening: "bg-slate-100 text-slate-700", fremvisning: "bg-sky-50 text-sky-800", dokumenter: "bg-amber-50 text-amber-900", bank: "bg-indigo-50 text-indigo-800", bud: "bg-orange-50 text-orange-800", koebt: "bg-emerald-50 text-emerald-800", droppet: "bg-slate-100 text-slate-500" };
const mio = (n: number) => (n >= 1e6 ? `${(n / 1e6).toLocaleString("da-DK", { maximumFractionDigits: 1 })} mio. kr.` : `${Math.round(n).toLocaleString("da-DK")} kr.`);
const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const street = (a: string) => a.split(",")[0];
const addrOf = (r: CrmRow) => r.property_data?.address || r.property_url || "Bolig";

function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 10 ? "Godmorgen" : h < 17 ? "God dag" : "God aften";
}

export function Overview({ firstName, initial, deals, positive }: { firstName: string; initial: CrmRow[]; deals: Opportunity[]; positive: number | null }) {
  const [rows, setRows] = useState(initial);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const mappeOf = (r: CrmRow): Mappe => ({ ...EMPTY_MAPPE, ...(r.property_data?.mappe ?? {}) });

  const doneTask = (rowId: string, taskId: string) => {
    const r = rowsRef.current.find((x) => x.id === rowId);
    if (!r) return;
    const m = mappeOf(r);
    const next = { ...m, tasks: (m.tasks ?? []).map((t) => (t.id === taskId ? { ...t, done: true } : t)) };
    const updated = { ...r, property_data: { ...(r.property_data ?? {}), mappe: next } };
    rowsRef.current = rowsRef.current.map((x) => (x.id === rowId ? updated : x));
    setRows(rowsRef.current);
    void saveMappe(r.id, r.property_data ?? {}, next);
  };

  const live = rows.filter((r) => mappeOf(r).stage !== "droppet");
  const inPlay = live.filter((r) => mappeOf(r).stage !== "koebt");
  const value = inPlay.reduce((s, r) => s + (Number(r.property_data?.price) || 0), 0);
  const tasks = useMemo(() => live.flatMap((r) => (mappeOf(r).tasks ?? []).filter((t) => !t.done).map((t) => ({ t, r })))
    .sort((a, b) => (a.t.due ?? "9999").localeCompare(b.t.due ?? "9999")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows]);
  const urgent = tasks.filter(({ t }) => t.due && daysUntil(t.due) <= 0).length;
  const viewings = tasks.filter(({ t }) => t.kind === "fremvisning" && t.due && daysUntil(t.due) >= 0 && daysUntil(t.due) <= 7).length;
  const offers = live.filter((r) => mappeOf(r).stage === "bud");
  const byStage = STAGES.filter((s) => s.id !== "koebt").map((s) => ({ ...s, n: live.filter((r) => mappeOf(r).stage === s.id).length }));
  const totalStage = byStage.reduce((a, b) => a + b.n, 0);
  const recent = [...live].sort((a, b) => (mappeOf(b).updatedAt ?? b.created_at).localeCompare(mappeOf(a).updatedAt ?? a.created_at)).slice(0, 4);

  const start = [
    { done: rows.length > 0, t: "Find eller indsæt en bolig", d: "Brug Find boliger, eller indsæt et link i søgefeltet øverst.", href: "/app/find" },
    { done: rows.length > 0, t: "Analysér og gem den", d: "Gemte boliger lander i din pipeline med tallene.", href: "/app/analyser" },
    { done: rows.some((r) => (mappeOf(r).docs ?? []).length > 0), t: "Upload et dokument", d: "Salgsopstilling eller referat, så læser vi det for dig.", href: rows[0] ? `/app/ejendomme/${rows[0].id}?fane=papirer` : "/app/analyser" },
    { done: rows.some((r) => (mappeOf(r).tasks ?? []).length > 0), t: "Planlæg en fremvisning", d: "Opgaver med dato samles under Næste skridt.", href: rows[0] ? `/app/ejendomme/${rows[0].id}?fane=opgaver` : "/app/opgaver" },
  ];
  const startDone = start.filter((s) => s.done).length;

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.025em] sm:text-[30px]">{greeting()}{firstName ? `, ${firstName}` : ""}</h1>
          <p className="mt-1 text-[15px] text-slate-500">
            {new Date().toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long" }).replace(/^./, (c) => c.toUpperCase())}
            {urgent > 0 ? ` · ${urgent} ${urgent === 1 ? "ting kræver" : "ting kræver"} dig i dag` : tasks.length ? " · intet haster i dag" : ""}
          </p>
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
        <Kpi label="I gang" value={inPlay.length} sub={value ? `${mio(value)} i alt` : "boliger i din pipeline"} href="/app/ejendomme" />
        <Kpi label="Fremvisninger" value={viewings} sub="de næste 7 dage" href="/app/opgaver" />
        <Kpi label="Bud ude" value={offers.length} sub={offers[0] ? street(addrOf(offers[0])) : "ingen lige nu"} href="/app/ejendomme" />
        <Kpi label="Nye muligheder" value={positive ?? deals.length} sub="betaler sig selv i dag" href="/app/find" />
      </div>

      {/* Pipeline */}
      <Link href="/app/ejendomme" data-tour="pipeline" className="mt-3 block rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 sm:p-5">
        <div className="flex items-center justify-between text-[14px]"><span className="font-semibold">Pipeline</span><span className="text-slate-500">{totalStage} {totalStage === 1 ? "bolig" : "boliger"}</span></div>
        <div className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-slate-100">
          {totalStage > 0 && byStage.filter((s) => s.n > 0).map((s) => <span key={s.id} className={clsx("transition-all duration-700", BAR[s.id])} style={{ flex: s.n }} />)}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-600">
          {byStage.map((s) => <span key={s.id} className="flex items-center gap-1.5"><span className={clsx("h-2 w-2 rounded-full", BAR[s.id])} />{s.label} <b className="font-semibold tabular-nums text-slate-900">{s.n}</b></span>)}
        </div>
      </Link>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Next steps */}
        <section data-tour="next-steps" aria-labelledby="next-h" className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <h2 id="next-h" className="text-[16px] font-semibold">Næste skridt</h2>
            <Link href="/app/opgaver" className="text-[14px] font-medium text-blue-700 hover:underline">Alle opgaver</Link>
          </div>
          {tasks.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <CalendarDays className="mx-auto text-slate-300" size={28} />
              <p className="mt-2 text-[15px] font-medium text-slate-700">Ingen opgaver lige nu</p>
              <p className="mt-1 text-[14px] text-slate-500">Planlæg en fremvisning eller et bankmøde på en af dine boliger.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {tasks.slice(0, 6).map(({ t, r }) => <TaskLine key={`${r.id}-${t.id}`} t={t} r={r} onDone={() => doneTask(r.id, t.id)} />)}
            </ul>
          )}
        </section>

        {/* Opportunities */}
        <section data-tour="opportunities" aria-labelledby="opp-h" className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <h2 id="opp-h" className="text-[16px] font-semibold">Nye muligheder</h2>
            <Link href="/app/find" className="text-[14px] font-medium text-blue-700 hover:underline">Deal-motoren</Link>
          </div>
          {deals.length === 0 ? (
            <p className="px-5 py-8 text-center text-[14px] text-slate-500">Deal-motoren opdaterer. Kig igen om lidt.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {deals.map((d) => (
                <li key={d.href} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  {d.image
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={d.image} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-lg bg-slate-100 object-cover" />
                    : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><Home size={18} /></span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{street(d.address)}</span>
                    <span className="block truncate text-[13px] text-slate-500">{d.zip} {d.city} · {kr(d.price)}</span>
                  </span>
                  <span className="hidden shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[12px] font-semibold tabular-nums text-emerald-700 sm:block">+{Math.round(d.cashFlow).toLocaleString("da-DK")} kr./md.</span>
                  <Link href={d.href} className="inline-flex h-9 shrink-0 items-center rounded-lg border border-slate-200 px-3 text-[13px] font-semibold text-slate-800 hover:border-slate-300">Analysér</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Recent properties */}
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
                    {img
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" />
                      : <span className="flex h-full items-center justify-center text-slate-300"><Home size={28} /></span>}
                    <span className={clsx("absolute left-2.5 top-2.5 rounded-md px-2 py-0.5 text-[12px] font-semibold", PILL[m.stage])}>{STAGE_LABEL[m.stage]}</span>
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
    </div>
  );
}

function Kpi({ label, value, sub, href }: { label: string; value: number; sub: string; href: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 sm:p-5">
      <p className="text-[13px] font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-[30px] font-semibold leading-none tabular-nums tracking-[-0.03em]">{value.toLocaleString("da-DK")}</p>
      <p className="mt-1.5 truncate text-[13px] text-slate-500">{sub}</p>
    </Link>
  );
}

function TaskLine({ t, r, onDone }: { t: Task; r: CrmRow; onDone: () => void }) {
  const d = t.due ? daysUntil(t.due) : null;
  return (
    <li className="flex items-center gap-2 px-3 py-1.5 sm:px-4">
      <button type="button" role="checkbox" aria-checked={false} aria-label={`Marker ${t.title} som klaret`} onClick={onDone} className="group flex h-11 w-11 shrink-0 items-center justify-center">
        <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-300 transition-colors group-hover:border-emerald-500 group-hover:bg-emerald-50"><Check size={11} strokeWidth={3} className="text-emerald-600 opacity-0 group-hover:opacity-100" /></span>
      </button>
      <Link href={`/app/ejendomme/${r.id}?fane=opgaver`} className="min-w-0 flex-1 py-1.5">
        <span className="block truncate text-[15px] font-medium">{t.title}</span>
        <span className="block truncate text-[13px] text-slate-500">{street(addrOf(r))}</span>
      </Link>
      <span className={clsx("shrink-0 pr-1 text-right text-[13px] tabular-nums", d != null && d < 0 ? "font-semibold text-rose-600" : d === 0 ? "font-semibold text-blue-700" : "text-slate-500")}>
        {t.due ? (d! < 0 ? "Overskredet" : d === 0 ? `I dag${t.due.length > 10 ? ` ${t.due.slice(11, 16).replace(":", ".")}` : ""}` : d === 1 ? "I morgen" : fmtDue(t.due).split(" kl.")[0]) : "Ingen dato"}
      </span>
    </li>
  );
}

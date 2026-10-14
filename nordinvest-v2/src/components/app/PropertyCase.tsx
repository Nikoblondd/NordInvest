"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, Building2, CalendarPlus, Calculator, Check, ChevronDown, Clock, ExternalLink, FileText, Gavel, Home, Loader2, Mail, Pencil, Phone, Plus, Upload } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { createClient } from "@/lib/supabase/client";
import { CHECKLIST, EMPTY_MAPPE, OFFER_STATUS, STAGES, STAGE_LABEL, itemsFor, type Contact, type Kind, type LogEntry, type Mappe as MappeData, type Offer, type Stage } from "@/lib/mappe/checklist";
import { DOC_CHECK, Documents, type MappeRow } from "@/components/mappe/Mappe";
import { NumberInput } from "@/components/ui/NumberInput";
import { KIND, clock, dayLabel, dayOf, itemsFrom, timeOf, toTask, withLog, ymd, type CalItem } from "@/lib/app/calendar";
import { EventDialog, type DialogState } from "./EventDialog";
import { OfferDialog, applyOffer, offersOf, OFFER_TONE } from "./OfferDialog";
import { ItemRow } from "./Calendar";
import { btn } from "./ui";
import { PropertyImage } from "./PropertyImage";
import type { Draft } from "./useCalendar";

/*
 * One property as a case (sagen), the way a deal looks in a CRM: the stage
 * bar on top, then tabs for the overview, appointments, bids, the documents
 * read by AI, the buying-process checklist, the agent's contact details and
 * notes with the case's activity. Every change is saved on the property
 * (property_data.mappe), so nothing is typed twice.
 */

type Tab = "overblik" | "aftaler" | "bud" | "papirer" | "tjekliste" | "kontakt" | "noter";
const TABS: { id: Tab; label: string }[] = [
  { id: "overblik", label: "Overblik" },
  { id: "aftaler", label: "Aftaler" },
  { id: "bud", label: "Bud" },
  { id: "papirer", label: "Papirer" },
  { id: "tjekliste", label: "Tjekliste" },
  { id: "kontakt", label: "Mægler" },
  { id: "noter", label: "Noter og aktivitet" },
];
const ALIAS: Record<string, Tab> = { opgaver: "aftaler" };
const STAGE_TONE: Record<Stage | "droppet", string> = {
  screening: "bg-slate-600 text-white", fremvisning: "bg-sky-600 text-white", dokumenter: "bg-amber-400 text-amber-950",
  bank: "bg-indigo-600 text-white", bud: "bg-orange-600 text-white", koebt: "bg-emerald-600 text-white", droppet: "bg-slate-300 text-slate-700",
};
const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const num = (n: number, d = 1) => n.toLocaleString("da-DK", { minimumFractionDigits: d, maximumFractionDigits: d });
const when = (iso: string) => new Date(iso).toLocaleString("da-DK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function PropertyCase({ row, initialTab }: { row: MappeRow; initialTab?: string }) {
  const pd = useMemo(() => row.property_data ?? {}, [row.property_data]);
  const [m, setM] = useState<MappeData>({ ...EMPTY_MAPPE, ...(pd.mappe ?? {}) });
  const startTab = initialTab ? ALIAS[initialTab] ?? initialTab : "overblik";
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.id === startTab) ? (startTab as Tab) : "overblik");
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [view, setView] = useState<Stage>(m.stage === "droppet" ? "screening" : m.stage);
  const [event, setEvent] = useState<DialogState>(null);
  const [offerEdit, setOfferEdit] = useState<{ offer: Offer | null } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const address = pd.address || row.property_url || "Bolig";
  const [street, ...rest] = address.split(",");
  const price = Number(pd.price) || 0;
  const kind: Kind | null = pd.propType === "condo" ? "lejlighed" : pd.propType === "villa" || pd.propType === "terraced" ? "hus" : null;
  const ar = row.analysis_result ?? {};
  const image = typeof pd.image === "string" ? pd.image : null;
  const listing = typeof pd.listingUrl === "string" ? pd.listingUrl : null;

  // Debounced save, always built on the newest case (a document review can
  // finish a minute later and must not undo what was typed meanwhile).
  const mRef = useRef(m);
  const persist = (upd: MappeData | ((cur: MappeData) => MappeData)) => {
    const next = typeof upd === "function" ? upd(mRef.current) : upd;
    mRef.current = next;
    setM(next);
    if (timer.current) clearTimeout(timer.current);
    setSaving("saving");
    timer.current = setTimeout(async () => {
      const supabase = createClient();
      if (!supabase) return setSaving("error");
      const { error } = await supabase.from("analyses").update({ property_data: { ...pd, mappe: { ...mRef.current, updatedAt: new Date().toISOString() } } }).eq("id", row.id);
      setSaving(error ? "error" : "saved");
    }, 600);
  };
  // A pending save still runs after navigating inside the app; closing the tab mid-save asks first.
  useEffect(() => {
    if (saving !== "saving") return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saving]);

  const pick = (t: Tab) => {
    setTab(t);
    const u = new URL(window.location.href);
    if (t === "overblik") u.searchParams.delete("fane"); else u.searchParams.set("fane", t);
    window.history.replaceState(null, "", u.toString());
  };

  const setStage = (s: Stage | "droppet") => {
    if (s === mRef.current.stage) return;
    persist((c) => withLog({ ...c, stage: s }, `Flyttet til ${STAGE_LABEL[s]}`, "fase"));
    if (s !== "droppet") setView(s);
  };
  const done = (id: string, auto?: string) => !!m.checks[id] || auto === "analysis";
  const progress = useMemo(() => {
    const all = CHECKLIST.filter((c) => !c.for || !kind || c.for === kind);
    return { done: all.filter((c) => done(c.id, c.auto)).length, total: all.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.checks, kind]);
  const highRisks = m.docs.flatMap((d) => d.risks.filter((r) => r.level === "hoej").map((r) => ({ ...r, doc: d.title })));
  const rentalNo = m.docs.find((d) => d.rental?.allowed === "nej" || d.rental?.allowed === "betinget");

  // Appointments as calendar items (the same model the calendar uses).
  const items = useMemo(() => itemsFrom([{ id: row.id, property_url: row.property_url, property_data: { ...pd, mappe: { ...m, stage: m.stage === "droppet" ? "screening" : m.stage } } }], []), [m, row.id, row.property_url, pd]);
  const today = ymd(new Date());
  const upcoming = items.filter((i) => !i.done && i.due && dayOf(i.due) >= today);
  const late = items.filter((i) => !i.done && i.due && dayOf(i.due) < today);
  const undated = items.filter((i) => !i.done && !i.due);
  const past = items.filter((i) => i.done).slice(-10).reverse();
  const offers = offersOf(m);
  const current = offers[0] ?? null;

  const saveEvent = async (d: Draft) => {
    const existed = d.key ? items.find((i) => i.key === d.key) : undefined;
    const task = toTask({ ...d, id: existed?.id ?? `t${Date.now()}` });
    persist((c) => {
      const tasks = existed ? (c.tasks ?? []).map((t) => (t.id === task.id ? task : t)) : [...(c.tasks ?? []), task];
      return existed ? { ...c, tasks } : withLog({ ...c, tasks }, `${task.title} planlagt`, "aftale");
    });
    return true;
  };
  const removeEvent = async (i: CalItem) => { persist((c) => ({ ...c, tasks: (c.tasks ?? []).filter((t) => t.id !== i.id) })); return true; };
  const toggleEvent = (i: CalItem) => persist((c) => {
    const tasks = (c.tasks ?? []).map((t) => (t.id === i.id ? { ...t, done: !t.done } : t));
    return i.done ? { ...c, tasks } : withLog({ ...c, tasks }, `${i.title} klaret`, "aftale");
  });

  const home = [{ id: row.id, address }];
  const stageIndex = STAGES.findIndex((s) => s.id === m.stage);

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <Link href="/app/ejendomme" className="inline-flex min-h-[40px] items-center gap-1.5 text-[14px] font-medium text-slate-500 hover:text-slate-900"><ArrowLeft size={15} /> Ejendomme</Link>

      {/* Header */}
      <div className="mt-2 flex flex-wrap items-start gap-4">
        <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-1 ring-slate-200 sm:h-20 sm:w-20"><PropertyImage src={image} /></span>
        <div className="min-w-0 flex-1 basis-[240px]">
          <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.02em] [text-wrap:balance] sm:text-[30px]">{street}</h1>
          <p className="mt-1 text-[15px] text-slate-500">{[rest.join(",").trim(), price ? kr(price) : "", pd.area ? `${pd.area} m²` : ""].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <StageSelect value={m.stage} onChange={setStage} />
          <button type="button" onClick={() => setEvent({ rowId: row.id, kind: "fremvisning" })} className={btn.secondary}><CalendarPlus size={15} /> Ny aftale</button>
          <button type="button" onClick={() => setOfferEdit({ offer: null })} className={btn.secondary}><Gavel size={15} /> Registrér bud</button>
          <Link href={`/app/analyser?saved=${row.id}`} className={btn.secondary}><Calculator size={15} /> Analysen</Link>
          {listing && <a href={listing} target="_blank" rel="noopener noreferrer" className={btn.secondary}><ExternalLink size={15} /> Annoncen</a>}
          <span className="ml-1 flex min-w-[70px] items-center gap-1.5 text-[13px] text-slate-500" aria-live="polite">
            {saving === "saving" && <><Loader2 size={13} className="animate-spin" /> Gemmer</>}
            {saving === "saved" && <><Check size={13} className="text-emerald-600" /> Gemt</>}
            {saving === "error" && <span className="text-rose-600">Kunne ikke gemme</span>}
          </span>
        </div>
      </div>

      {/* Stage bar */}
      {m.stage !== "droppet" && (
        <>
        {/* Phones: the six stages as one segmented bar with the current one named. */}
        <div className="mt-5 sm:hidden">
          <div className="flex items-baseline justify-between text-[13px]">
            <span className="font-semibold text-slate-900">Fase {stageIndex + 1} af {STAGES.length}: {STAGES[stageIndex]?.label}</span>
            {stageIndex < STAGES.length - 1 && <button type="button" onClick={() => setStage(STAGES[stageIndex + 1].id)} className="font-semibold text-blue-700">Næste fase</button>}
          </div>
          <ol className="mt-2 flex gap-1" aria-label="Fase">
            {STAGES.map((s, i) => (
              <li key={s.id} className="flex-1">
                <button type="button" onClick={() => setStage(s.id)} aria-label={s.label} aria-current={i === stageIndex ? "step" : undefined}
                  className={clsx("block h-2 w-full rounded-full", i === stageIndex ? STAGE_TONE[s.id] : i < stageIndex ? "bg-slate-800" : "bg-slate-200")} />
              </li>
            ))}
          </ol>
        </div>
        <nav aria-label="Fase" className="mt-5 hidden sm:block">
          <ol className="flex">
            {STAGES.map((s, i) => {
              const passed = i < stageIndex, on = i === stageIndex;
              return (
                <li key={s.id} className="flex-1">
                  <button type="button" onClick={() => setStage(s.id)} aria-current={on ? "step" : undefined}
                    className={clsx("relative flex h-10 w-full items-center justify-center gap-1.5 text-[13px] font-semibold transition-colors [clip-path:polygon(0_0,calc(100%-10px)_0,100%_50%,calc(100%-10px)_100%,0_100%,10px_50%)] first:[clip-path:polygon(0_0,calc(100%-10px)_0,100%_50%,calc(100%-10px)_100%,0_100%)]",
                      on ? STAGE_TONE[s.id] : passed ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-slate-200/70 text-slate-500 hover:bg-slate-200")}>
                    {passed && <Check size={13} strokeWidth={3} />}{s.label}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
        </>
      )}

      {/* Tabs */}
      <div role="tablist" aria-label="Sagen" className="-mx-4 mt-5 flex gap-1 overflow-x-auto border-b border-slate-200 px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {TABS.map((t) => {
          const n = t.id === "papirer" ? m.docs.length : t.id === "aftaler" ? upcoming.length + late.length : t.id === "tjekliste" ? progress.total - progress.done : t.id === "bud" ? offers.length : 0;
          return (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => pick(t.id)}
              className={clsx("-mb-px flex min-h-[46px] shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-[14px] font-semibold transition-colors", tab === t.id ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800")}>
              {t.label}{n > 0 && <span className={clsx("rounded-full px-1.5 text-[12px] tabular-nums", t.id === "aftaler" && late.length ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600")}>{n}</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {tab === "overblik" && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div className="space-y-5">
              <Card title="Tallene" action={<Link href={`/app/analyser?saved=${row.id}`} className="inline-flex items-center gap-1 text-[14px] font-semibold text-blue-700 hover:underline">Åbn analysen <ArrowRight size={14} /></Link>}>
                {ar.cashFlow == null && ar.capRate == null ? (
                  <p className="text-[15px] text-slate-500">Ingen analyse endnu. Åbn analysen for at beregne ejendommen.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {ar.cashFlow != null && <Fig k="Cash flow" v={`${ar.cashFlow >= 0 ? "+" : "-"}${Math.round(Math.abs(ar.cashFlow)).toLocaleString("da-DK")}`} u="kr./md." tone={ar.cashFlow >= 0 ? "text-emerald-700" : "text-rose-600"} />}
                    {ar.capRate != null && <Fig k="Nettoafkast" v={num(ar.capRate)} u="%" />}
                    {ar.dscr != null && <Fig k="Gældsdækning" v={num(ar.dscr, 2)} u="DSCR" />}
                    {row.investment_score != null && <Fig k="Score" v={String(row.investment_score)} u="af 100" />}
                  </div>
                )}
              </Card>
              <Card title="Købsprocessen" action={<button type="button" onClick={() => pick("tjekliste")} className="inline-flex items-center gap-1 text-[14px] font-semibold text-blue-700 hover:underline">Tjeklisten <ArrowRight size={14} /></button>}>
                <p className="text-[14px] text-slate-500">{progress.done} af {progress.total} punkter klaret</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} /></div>
                <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {STAGES.map((s) => {
                    const its = itemsFor(s.id, kind);
                    const n = its.filter((c) => done(c.id, c.auto)).length;
                    return (
                      <li key={s.id}>
                        <button type="button" onClick={() => { setView(s.id); pick("tjekliste"); }} className={clsx("flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[14px] transition-colors hover:border-slate-300", m.stage === s.id ? "border-slate-900" : "border-slate-200")}>
                          <span className={clsx("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[12px] font-bold", n === its.length ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600")}>{n === its.length ? <Check size={12} strokeWidth={3} /> : n}</span>
                          <span className="min-w-0 flex-1 truncate font-medium">{s.label}</span>
                          <span className="hidden text-[12px] tabular-nums text-slate-400 min-[420px]:inline">{n}/{its.length}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </Card>
              {(highRisks.length > 0 || rentalNo) && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
                  <h2 className="flex items-center gap-2 text-[16px] font-semibold text-rose-900"><AlertTriangle size={17} /> Røde flag fra papirerne</h2>
                  <ul className="mt-2 space-y-2 text-[15px] text-rose-900">
                    {rentalNo && <li><b className="font-semibold">Udlejning:</b> {rentalNo.rental?.note}</li>}
                    {highRisks.slice(0, 4).map((r, i) => <li key={i}><b className="font-semibold">{r.title}.</b> {r.detail}</li>)}
                  </ul>
                  <button type="button" onClick={() => pick("papirer")} className="mt-3 inline-flex min-h-[40px] items-center gap-1 text-[14px] font-semibold text-rose-800 hover:underline">Se papirerne <ArrowRight size={14} /></button>
                </div>
              )}
              <Card title="Aktivitet" action={<button type="button" onClick={() => pick("noter")} className="text-[14px] font-semibold text-blue-700 hover:underline">Alt</button>}>
                <Activity log={m.log ?? []} limit={5} created={row.created_at} />
              </Card>
            </div>
            <div className="space-y-5">
              <Card title="Kommende aftaler" action={<button type="button" onClick={() => setEvent({ rowId: row.id, kind: "fremvisning" })} className="inline-flex items-center gap-1 text-[14px] font-semibold text-blue-700 hover:underline"><Plus size={14} /> Ny</button>}>
                {late.length + upcoming.length === 0 ? (
                  <div className="text-[15px] text-slate-500">
                    <p>Intet planlagt.</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(["fremvisning", "bank", "maegler"] as const).map((k) => <button key={k} type="button" onClick={() => setEvent({ rowId: row.id, kind: k })} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:ring-slate-300"><span className={clsx("h-2 w-2 rounded-full", KIND[k].dot)} />{KIND[k].label}</button>)}
                    </div>
                  </div>
                ) : (
                  <ul className="-mx-3 divide-y divide-slate-100">
                    {[...late, ...upcoming].slice(0, 4).map((i) => <ItemRow key={i.key} i={i} showDay onOpen={() => setEvent({ item: i })} onToggle={() => toggleEvent(i)} />)}
                  </ul>
                )}
              </Card>
              <Card title="Bud" action={<button type="button" onClick={() => current ? pick("bud") : setOfferEdit({ offer: null })} className="text-[14px] font-semibold text-blue-700 hover:underline">{current ? "Historik" : "Registrér"}</button>}>
                {current ? (
                  <div>
                    <p className="flex flex-wrap items-center gap-2"><b className="text-[22px] font-semibold tabular-nums">{kr(current.amount)}</b><span className={clsx("rounded-md px-1.5 py-0.5 text-[12px] font-semibold ring-1", OFFER_TONE[current.status])}>{OFFER_STATUS[current.status]}</span></p>
                    {current.status === "modbud" && current.counter && <p className="mt-1 text-[14px] text-amber-800">Sælger vil have {kr(current.counter)}</p>}
                    {current.deadline && (current.status === "afgivet" || current.status === "modbud") && <p className="mt-1 flex items-center gap-1.5 text-[14px] text-slate-600"><Clock size={14} /> Svarfrist {dayLabel(dayOf(current.deadline)).toLowerCase()}{timeOf(current.deadline) ? ` kl. ${clock(timeOf(current.deadline)!)}` : ""}</p>}
                    {price > 0 && <p className="mt-1 text-[13px] text-slate-500">{num(((current.amount - price) / price) * 100)} % fra udbudsprisen · {offers.length} {offers.length === 1 ? "bud" : "bud"} i alt</p>}
                  </div>
                ) : <p className="text-[15px] text-slate-500">Intet bud endnu.{m.maxBid ? ` Dit maks er ${kr(m.maxBid)}.` : ""}</p>}
              </Card>
              <Card title="Mægler" action={<button type="button" onClick={() => pick("kontakt")} className="text-[14px] font-semibold text-blue-700 hover:underline">{m.contact?.name ? "Ret" : "Tilføj"}</button>}>
                {m.contact?.name || m.contact?.phone ? (
                  <div className="text-[15px]">
                    <p className="font-semibold">{m.contact.name}{m.contact.company ? <span className="font-normal text-slate-500"> · {m.contact.company}</span> : null}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4">
                      {m.contact.phone && <a href={`tel:${m.contact.phone.replace(/\s/g, "")}`} className="inline-flex min-h-[40px] items-center gap-1.5 font-medium text-blue-700"><Phone size={14} /> {m.contact.phone}</a>}
                      {m.contact.email && <a href={`mailto:${m.contact.email}`} className="inline-flex min-h-[40px] items-center gap-1.5 font-medium text-blue-700"><Mail size={14} /> Skriv</a>}
                    </div>
                  </div>
                ) : <p className="text-[15px] text-slate-500">Tilføj mæglerens kontaktoplysninger.</p>}
              </Card>
            </div>
          </div>
        )}

        {tab === "aftaler" && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="space-y-5">
              <Card title="Aftaler" action={<button type="button" onClick={() => setEvent({ rowId: row.id, kind: "fremvisning" })} className={btn.primary}><Plus size={15} /> Ny aftale</button>} pad={false}>
                {late.length + upcoming.length === 0 ? (
                  <div className="px-5 pb-8 pt-4 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/app/il-cal.jpg" alt="" className="mx-auto w-full max-w-[220px]" />
                    <p className="text-[15px] font-medium text-slate-700">Ingen kommende aftaler</p>
                    <p className="mt-1 text-[14px] text-slate-500">Planlæg fremvisning, bankmøde eller opkald til mægleren. Du får en påmindelse på mail dagen før.</p>
                    <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                      {(["fremvisning", "bank", "maegler", "raadgiver"] as const).map((k) => <button key={k} type="button" onClick={() => setEvent({ rowId: row.id, kind: k })} className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:ring-slate-300"><span className={clsx("h-2 w-2 rounded-full", KIND[k].dot)} />{KIND[k].label}</button>)}
                    </div>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {late.map((i) => <ItemRow key={i.key} i={i} showDay onOpen={() => setEvent({ item: i })} onToggle={() => toggleEvent(i)} />)}
                    {upcoming.map((i) => <ItemRow key={i.key} i={i} showDay onOpen={() => setEvent({ item: i })} onToggle={() => toggleEvent(i)} />)}
                  </ul>
                )}
              </Card>
              {past.length > 0 && (
                <Card title="Klaret" pad={false}>
                  <ul className="divide-y divide-slate-100">{past.map((i) => <ItemRow key={i.key} i={i} showDay onOpen={() => setEvent({ item: i })} onToggle={() => toggleEvent(i)} />)}</ul>
                </Card>
              )}
            </div>
            <Todo items={undated} onAdd={(title) => persist((c) => ({ ...c, tasks: [...(c.tasks ?? []), { id: `t${Date.now()}`, kind: "andet", title, due: null, done: false }] }))} onToggle={toggleEvent} onOpen={(i) => setEvent({ item: i })} />
          </div>
        )}

        {tab === "bud" && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Card title="Budhistorik" action={<button type="button" onClick={() => setOfferEdit({ offer: null })} className={btn.primary}><Plus size={15} /> Nyt bud</button>} pad={false}>
              {offers.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <Gavel className="mx-auto text-slate-300" size={26} />
                  <p className="mt-2 text-[15px] font-medium text-slate-700">Intet bud endnu</p>
                  <p className="mt-1 text-[14px] text-slate-500">Registrér dit bud for at følge modbud og svarfrister her og i kalenderen.</p>
                </div>
              ) : (
                <ol className="relative px-5 py-4">
                  <span aria-hidden className="absolute bottom-6 left-[29px] top-6 w-px bg-slate-200" />
                  {offers.map((o, i) => (
                    <li key={o.id ?? i} className="relative flex gap-4 py-2.5">
                      <span className={clsx("relative z-10 mt-1 h-3 w-3 shrink-0 rounded-full ring-4 ring-white", i === 0 ? "bg-orange-500" : "bg-slate-300")} />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2"><b className="text-[17px] font-semibold tabular-nums text-slate-900">{kr(o.amount)}</b><span className={clsx("rounded-md px-1.5 py-0.5 text-[12px] font-semibold ring-1", OFFER_TONE[o.status])}>{OFFER_STATUS[o.status]}</span></p>
                        <p className="mt-0.5 text-[13px] text-slate-500">Afgivet {new Date(`${o.date.slice(0, 10)}T12:00`).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" })}{price ? ` · ${num(((o.amount - price) / price) * 100)} % fra udbud` : ""}</p>
                        {o.status === "modbud" && o.counter && <p className="mt-1 text-[14px] font-medium text-amber-800">Modbud: {kr(o.counter)}</p>}
                        {o.deadline && <p className="mt-1 flex items-center gap-1.5 text-[13px] text-slate-600"><Clock size={13} /> Svarfrist {new Date(o.deadline).toLocaleString("da-DK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>}
                        {o.note && <p className="mt-1 text-[14px] text-slate-700">{o.note}</p>}
                      </div>
                      <button type="button" onClick={() => setOfferEdit({ offer: o })} aria-label="Ret bud" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil size={15} /></button>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
            <div className="space-y-5">
              <Card title="Dit maks">
                <label htmlFor="maxbid" className="text-[14px] text-slate-600">Det højeste, du vil give. Bestem det, før du forhandler.</label>
                <div className="mt-2 flex h-11 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
                  <NumberInput id="maxbid" value={m.maxBid ?? null} onValueChange={(v) => persist((c) => ({ ...c, maxBid: v }))} placeholder="Fx 2.400.000" className="w-full min-w-0 bg-transparent text-[16px] font-semibold tabular-nums outline-none placeholder:font-normal placeholder:text-slate-400" />
                  <span className="text-[13px] text-slate-500">kr.</span>
                </div>
                {m.maxBid && price ? <p className="mt-2 text-[13px] text-slate-500">{num(((m.maxBid - price) / price) * 100)} % fra udbudsprisen</p> : null}
                <Link href={`/app/analyser?saved=${row.id}`} className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 text-[14px] font-semibold text-blue-700 hover:underline"><Calculator size={15} /> Beregn dit maksimale bud i analysen</Link>
              </Card>
              <Card title="Før du byder">
                <ul className="space-y-2.5 text-[15px] text-slate-700">
                  {["Byd med advokat- og finansieringsforbehold", "Sæt en kort svarfrist", "Lad en købers rådgiver gennemgå købsaftalen"].map((t) => <li key={t} className="flex gap-2.5"><Check size={17} className="mt-0.5 shrink-0 text-emerald-600" />{t}</li>)}
                </ul>
              </Card>
            </div>
          </div>
        )}

        {tab === "papirer" && (
          <div className="-mt-4">
            <Documents address={address} price={price} docs={m.docs}
              onAdd={(d) => { const check = DOC_CHECK[d.type]; persist((c) => withLog({ ...c, docs: [d, ...c.docs], checks: check ? { ...c.checks, [check]: true } : c.checks }, `${d.title} gennemgået`, "dokument")); }}
              onRemove={(id) => persist((c) => ({ ...c, docs: c.docs.filter((d) => d.id !== id) }))} />
          </div>
        )}

        {tab === "tjekliste" && (
          <Checklist m={m} kind={kind} view={view} setView={setView} setStage={setStage} done={done}
            toggle={(id) => persist((c) => ({ ...c, checks: { ...c.checks, [id]: !c.checks[id] } }))} rowId={row.id} goPapers={() => pick("papirer")} />
        )}

        {tab === "kontakt" && <ContactForm contact={m.contact ?? {}} onChange={(contact) => persist((c) => ({ ...c, contact }))} />}

        {tab === "noter" && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <label htmlFor="noter" className="text-[16px] font-semibold text-slate-900">Noter</label>
              <textarea id="noter" value={m.notes} onChange={(e) => { const notes = e.target.value; persist((c) => ({ ...c, notes })); }} rows={12}
                placeholder="Fx indtryk fra fremvisningen, svar fra mægleren, bankens tilbud"
                className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-[16px] leading-relaxed text-slate-900 outline-none focus:border-blue-500 focus:bg-white" />
              <p className="mt-1.5 text-[13px] text-slate-500">Gemmes automatisk.</p>
            </section>
            <Card title="Aktivitet"><Activity log={m.log ?? []} created={row.created_at} /></Card>
          </div>
        )}
      </div>

      <div className="mt-10 border-t border-slate-200 pt-5">
        {m.stage === "droppet"
          ? <button type="button" onClick={() => setStage("screening")} className={btn.secondary}>Genåbn sagen</button>
          : <button type="button" onClick={() => setStage("droppet")} className="min-h-[44px] px-1 text-[14px] font-medium text-slate-500 hover:text-rose-600">Drop boligen</button>}
      </div>

      <EventDialog state={event} onClose={() => setEvent(null)} homes={home} onSave={saveEvent} onDelete={removeEvent} />
      <OfferDialog open={!!offerEdit} onClose={() => setOfferEdit(null)} offer={offerEdit?.offer ?? null} price={price} maxBid={m.maxBid}
        onSave={(o, existed) => { persist((c) => applyOffer(c, o, existed)); return true; }} />
    </div>
  );
}

function Activity({ log, limit, created }: { log: LogEntry[]; limit?: number; created: string }) {
  const entries: LogEntry[] = [...log, { at: created, text: "Boligen blev gemt i NordInvest", kind: "oprettet" }];
  const uniq = entries.filter((e, i) => !(e.kind === "oprettet" && entries.findIndex((x) => x.kind === "oprettet") !== i));
  const shown = limit ? uniq.slice(0, limit) : uniq;
  const icon: Record<LogEntry["kind"], React.ReactNode> = {
    fase: <ArrowRight size={13} />, bud: <Gavel size={13} />, aftale: <CalendarPlus size={13} />, dokument: <FileText size={13} />, note: <Pencil size={13} />, oprettet: <Home size={13} />,
  };
  return (
    <ol className="space-y-3">
      {shown.map((e, i) => (
        <li key={`${e.at}-${i}`} className="flex gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">{icon[e.kind]}</span>
          <span className="min-w-0"><span className="block text-[14px] text-slate-800">{e.text}</span><span className="block text-[12px] text-slate-400">{when(e.at)}</span></span>
        </li>
      ))}
    </ol>
  );
}

function Todo({ items, onAdd, onToggle, onOpen }: { items: CalItem[]; onAdd: (t: string) => void; onToggle: (i: CalItem) => void; onOpen: (i: CalItem) => void }) {
  const [t, setT] = useState("");
  return (
    <section className="h-fit rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-[15px] font-semibold">Huskeliste</h2><p className="text-[13px] text-slate-500">Ting uden dato, fx &quot;Bed om energimærke&quot;.</p></div>
      <form onSubmit={(e) => { e.preventDefault(); if (t.trim()) { onAdd(t.trim().slice(0, 140)); setT(""); } }} className="flex gap-2 px-4 pt-4">
        <label htmlFor="todo" className="sr-only">Ny opgave</label>
        <input id="todo" value={t} onChange={(e) => setT(e.target.value)} placeholder="Tilføj til huskelisten" className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-[15px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
        <button type="submit" disabled={!t.trim()} className="h-10 rounded-lg bg-slate-900 px-3.5 text-[14px] font-semibold text-white disabled:opacity-40">Tilføj</button>
      </form>
      {items.length === 0 ? <p className="px-5 py-5 text-[14px] text-slate-500">Intet på listen.</p> : (
        <ul className="mt-2 divide-y divide-slate-100 pb-1">{items.map((i) => <ItemRow key={i.key} i={i} onOpen={() => onOpen(i)} onToggle={() => onToggle(i)} />)}</ul>
      )}
    </section>
  );
}

function StageSelect({ value, onChange }: { value: Stage | "droppet"; onChange: (s: Stage | "droppet") => void }) {
  return (
    <span className={clsx("relative inline-flex h-[42px] items-center rounded-lg pl-3.5 pr-8 text-[14px] font-semibold", STAGE_TONE[value])}>
      {STAGE_LABEL[value]}
      <ChevronDown size={15} className="pointer-events-none absolute right-2.5 opacity-80" />
      <select aria-label="Fase" value={value} onChange={(e) => onChange(e.target.value as Stage | "droppet")} className="absolute inset-0 cursor-pointer opacity-0">
        {(["screening", "fremvisning", "dokumenter", "bank", "bud", "koebt", "droppet"] as const).map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
      </select>
    </span>
  );
}

function Card({ title, action, children, pad = true }: { title: string; action?: React.ReactNode; children: React.ReactNode; pad?: boolean }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <div className={clsx("flex items-center justify-between gap-3", pad ? "px-5 pb-3 pt-5" : "border-b border-slate-100 px-5 py-3.5")}><h2 className="text-[16px] font-semibold">{title}</h2>{action}</div>
      <div className={pad ? "px-5 pb-5" : ""}>{children}</div>
    </section>
  );
}

function Fig({ k, v, u, tone }: { k: string; v: string; u: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[13px] text-slate-500">{k}</p>
      <p className={clsx("mt-0.5 text-[20px] font-semibold tabular-nums tracking-[-0.02em]", tone)}>{v} <span className="text-[13px] font-medium text-slate-500">{u}</span></p>
    </div>
  );
}

function Checklist({ m, kind, view, setView, setStage, done, toggle, rowId, goPapers }: {
  m: MappeData; kind: Kind | null; view: Stage; setView: (s: Stage) => void; setStage: (s: Stage | "droppet") => void;
  done: (id: string, auto?: string) => boolean; toggle: (id: string) => void; rowId: string; goPapers: () => void;
}) {
  const stage = STAGES.find((s) => s.id === view)!;
  return (
    <div>
      <nav aria-label="Faser" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <ol className="flex min-w-max gap-2">
          {STAGES.map((s, i) => {
            const its = itemsFor(s.id, kind);
            const n = its.filter((c) => done(c.id, c.auto)).length;
            return (
              <li key={s.id}>
                <button type="button" onClick={() => setView(s.id)} aria-current={view === s.id ? "step" : undefined}
                  className={clsx("flex min-h-[48px] items-center gap-2 rounded-xl border px-3 text-left transition-colors", view === s.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300")}>
                  <span className={clsx("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold", n === its.length ? "bg-emerald-500 text-white" : view === s.id ? "bg-white/15" : "bg-slate-100 text-slate-600")}>{n === its.length ? <Check size={13} strokeWidth={3} /> : i + 1}</span>
                  <span><span className="block text-[14px] font-semibold leading-tight">{s.label}</span><span className={clsx("block text-[12px]", view === s.id ? "text-white/70" : "text-slate-500")}>{m.stage === s.id ? "Du er her" : `${n} af ${its.length}`}</span></span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      <section className="mt-4 rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div><h2 className="text-[18px] font-semibold">{stage.label}</h2><p className="text-[15px] text-slate-500">{stage.lead}</p></div>
          {m.stage !== view && <button type="button" onClick={() => setStage(view)} className={btn.secondary}>Flyt sagen hertil</button>}
        </div>
        <ul className="divide-y divide-slate-100">
          {itemsFor(view, kind).map((c) => {
            const ok = done(c.id, c.auto);
            return (
              <li key={c.id} className="flex gap-3.5 px-5 py-4">
                <button type="button" role="checkbox" aria-checked={ok} disabled={!!c.auto} onClick={() => toggle(c.id)} aria-label={c.title} className="-m-1.5 flex h-10 w-10 shrink-0 items-center justify-center">
                  <span className={clsx("flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors", ok ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white hover:border-slate-400")}>{ok && <Check size={14} strokeWidth={3} />}</span>
                </button>
                <div className="min-w-0">
                  <p className={clsx("text-[15px] font-semibold", ok ? "text-slate-500" : "text-slate-900")}>{c.title}</p>
                  <p className="mt-0.5 text-[14px] leading-relaxed text-slate-600">{c.why}</p>
                  {c.where && (c.where.href
                    ? <a href={c.where.href} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-[40px] items-center gap-1 text-[14px] font-semibold text-blue-700 hover:underline">{c.where.label} <ExternalLink size={13} /></a>
                    : /^(Analysen|Juster|Bankrapport)/.test(c.where.label)
                      ? <Link href={`/app/analyser?saved=${rowId}`} className="mt-1 inline-flex min-h-[40px] items-center gap-1 text-[14px] font-semibold text-blue-700 hover:underline">{c.where.label} <ArrowRight size={13} /></Link>
                      : <p className="mt-1 text-[13px] text-slate-500">Hvor: {c.where.label}</p>)}
                  {c.stage === "dokumenter" && c.id !== "energi" && !ok && (
                    <button type="button" onClick={goPapers} className="mt-2 inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[14px] font-semibold text-slate-800 hover:border-slate-300"><Upload size={14} /> Upload til gennemgang</button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function ContactForm({ contact, onChange }: { contact: Contact; onChange: (c: Contact) => void }) {
  const field = (k: keyof Contact, text: string, type = "text") => (
    <div>
      <label htmlFor={`c-${k}`} className="text-[14px] font-medium text-slate-700">{text}</label>
      <input id={`c-${k}`} type={type} autoComplete="off" value={contact[k] ?? ""} onChange={(e) => onChange({ ...contact, [k]: e.target.value.slice(0, 120) })}
        className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[16px] focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" />
    </div>
  );
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-[17px] font-semibold"><Building2 size={18} className="text-slate-400" /> Mægler</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {field("name", "Navn")}
          {field("company", "Firma")}
          {field("phone", "Telefon", "tel")}
          {field("email", "E-mail", "email")}
        </div>
        <p className="mt-3 text-[13px] text-slate-500">Gemmes automatisk på boligen.</p>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-[17px] font-semibold">Ring eller skriv</h2>
        {contact.phone || contact.email ? (
          <div className="mt-3 grid gap-2">
            {contact.phone && <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-blue-600 text-[15px] font-semibold text-white hover:bg-blue-500"><Phone size={16} /> Ring {contact.phone}</a>}
            {contact.email && <a href={`mailto:${contact.email}`} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-slate-300 text-[15px] font-semibold hover:border-slate-400"><Mail size={16} /> Skriv til {contact.name?.split(" ")[0] || "mægleren"}</a>}
          </div>
        ) : <p className="mt-2 text-[15px] text-slate-500">Gemte kontaktoplysninger kan bruges til at ringe eller skrive direkte herfra.</p>}
      </section>
    </div>
  );
}

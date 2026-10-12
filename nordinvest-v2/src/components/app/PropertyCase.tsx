"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, Building2, Calculator, Check, ChevronDown, ExternalLink, Home, Loader2, Mail, Phone, Upload } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { createClient } from "@/lib/supabase/client";
import { CHECKLIST, EMPTY_MAPPE, OFFER_STATUS, STAGES, STAGE_LABEL, daysUntil, fmtDue, itemsFor, type Contact, type Kind, type Mappe as MappeData, type Stage } from "@/lib/mappe/checklist";
import { DOC_CHECK, Documents, MappeTasks, OfferBox, type MappeRow } from "@/components/mappe/Mappe";

/*
 * One property as a case (sagen). Everything about it lives here, in tabs:
 * the overview, the buying-process checklist, the documents read by AI, tasks
 * and notes, the agent's contact details and the offer. Every change is saved
 * on the property (property_data.mappe), so nothing is typed twice.
 */

type Tab = "overblik" | "tjekliste" | "papirer" | "opgaver" | "kontakt" | "bud";
const TABS: { id: Tab; label: string }[] = [
  { id: "overblik", label: "Overblik" },
  { id: "tjekliste", label: "Tjekliste" },
  { id: "papirer", label: "Papirer" },
  { id: "opgaver", label: "Opgaver og noter" },
  { id: "kontakt", label: "Kontakt" },
  { id: "bud", label: "Bud" },
];
const STAGE_TONE: Record<Stage | "droppet", string> = {
  screening: "bg-slate-600 text-white", fremvisning: "bg-sky-600 text-white", dokumenter: "bg-amber-400 text-amber-950",
  bank: "bg-indigo-600 text-white", bud: "bg-orange-600 text-white", koebt: "bg-emerald-600 text-white", droppet: "bg-slate-300 text-slate-700",
};
const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const num = (n: number, d = 1) => n.toLocaleString("da-DK", { minimumFractionDigits: d, maximumFractionDigits: d });

export function PropertyCase({ row, initialTab }: { row: MappeRow; initialTab?: string }) {
  const pd = row.property_data ?? {};
  const [m, setM] = useState<MappeData>({ ...EMPTY_MAPPE, ...(pd.mappe ?? {}) });
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.id === initialTab) ? (initialTab as Tab) : "overblik");
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [view, setView] = useState<Stage>(m.stage === "droppet" ? "screening" : m.stage);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const address = pd.address || row.property_url || "Bolig";
  const [street, ...rest] = address.split(",");
  const price = Number(pd.price) || 0;
  const kind: Kind | null = pd.propType === "condo" ? "lejlighed" : pd.propType === "villa" || pd.propType === "terraced" ? "hus" : null;
  const ar = row.analysis_result ?? {};
  const image = typeof pd.image === "string" ? pd.image : null;
  const listing = typeof pd.listingUrl === "string" ? pd.listingUrl : null;

  // Debounced save, always built on the newest mappe (a document review can
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
      const { error } = await supabase.from("analyses").update({ property_data: { ...pd, mappe: { ...next, updatedAt: new Date().toISOString() } } }).eq("id", row.id);
      setSaving(error ? "error" : "saved");
    }, 600);
  };
  // A pending save still runs after navigating away inside the app (the timer
  // is not cleared). Closing the tab mid-save asks first.
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

  const setStage = (s: Stage | "droppet") => { persist((c) => ({ ...c, stage: s })); if (s !== "droppet") setView(s); };
  const done = (id: string, auto?: string) => !!m.checks[id] || auto === "analysis";
  const progress = useMemo(() => {
    const all = CHECKLIST.filter((c) => !c.for || !kind || c.for === kind);
    return { done: all.filter((c) => done(c.id, c.auto)).length, total: all.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.checks, kind]);
  const highRisks = m.docs.flatMap((d) => d.risks.filter((r) => r.level === "hoej").map((r) => ({ ...r, doc: d.title })));
  const rentalNo = m.docs.find((d) => d.rental?.allowed === "nej" || d.rental?.allowed === "betinget");
  const openTasks = (m.tasks ?? []).filter((t) => !t.done).sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <Link href="/app/ejendomme" className="inline-flex min-h-[40px] items-center gap-1.5 text-[14px] font-medium text-slate-500 hover:text-slate-900"><ArrowLeft size={15} /> Ejendomme</Link>

      {/* Header */}
      <div className="mt-2 flex flex-wrap items-start gap-4">
        <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-20 sm:w-20">
          {image
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={image} alt="" className="h-full w-full object-cover" />
            : <span className="flex h-full w-full items-center justify-center text-slate-300"><Home size={28} /></span>}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.02em] [text-wrap:balance] sm:text-[30px]">{street}</h1>
          <p className="mt-1 text-[15px] text-slate-500">{[rest.join(",").trim(), price ? kr(price) : "", pd.area ? `${pd.area} m²` : ""].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <StageSelect value={m.stage} onChange={setStage} />
          <Link href={`/app/analyser?saved=${row.id}`} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-[14px] font-semibold text-slate-800 hover:border-slate-300"><Calculator size={15} /> Analysen</Link>
          {listing && <a href={listing} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-[14px] font-semibold text-slate-800 hover:border-slate-300"><ExternalLink size={15} /> Annoncen</a>}
          <span className="ml-1 flex min-w-[70px] items-center gap-1.5 text-[13px] text-slate-500" aria-live="polite">
            {saving === "saving" && <><Loader2 size={13} className="animate-spin" /> Gemmer</>}
            {saving === "saved" && <><Check size={13} className="text-emerald-600" /> Gemt</>}
            {saving === "error" && <span className="text-rose-600">Kunne ikke gemme</span>}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Sagen" className="-mx-4 mt-6 flex gap-1 overflow-x-auto border-b border-slate-200 px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {TABS.map((t) => {
          const n = t.id === "papirer" ? m.docs.length : t.id === "opgaver" ? openTasks.length : t.id === "tjekliste" ? progress.total - progress.done : 0;
          return (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => pick(t.id)}
              className={clsx("-mb-px flex min-h-[46px] shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-[14px] font-semibold transition-colors", tab === t.id ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800")}>
              {t.label}{n > 0 && <span className="rounded-full bg-slate-100 px-1.5 text-[12px] tabular-nums text-slate-600">{n}</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {tab === "overblik" && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div className="space-y-5">
              <Card title="Tallene" action={<Link href={`/app/analyser?saved=${row.id}`} className="inline-flex items-center gap-1 text-[14px] font-semibold text-blue-700 hover:underline">Åbn analysen <ArrowRight size={14} /></Link>}>
                {ar.cashFlow == null && ar.capRate == null ? (
                  <p className="text-[15px] text-slate-500">Ingen tal endnu. Åbn analysen for at regne boligen igennem.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {ar.cashFlow != null && <Fig k="Overskud" v={`${ar.cashFlow >= 0 ? "+" : "-"}${Math.round(Math.abs(ar.cashFlow)).toLocaleString("da-DK")}`} u="kr./md." tone={ar.cashFlow >= 0 ? "text-emerald-700" : "text-rose-600"} />}
                    {ar.capRate != null && <Fig k="Afkast af prisen" v={num(ar.capRate)} u="%" />}
                    {ar.dscr != null && <Fig k="Lejen dækker lånet" v={num(ar.dscr, 2)} u="gange" />}
                    {row.investment_score != null && <Fig k="Score" v={String(row.investment_score)} u="af 100" />}
                  </div>
                )}
              </Card>
              <Card title="Købsprocessen" action={<button type="button" onClick={() => pick("tjekliste")} className="inline-flex items-center gap-1 text-[14px] font-semibold text-blue-700 hover:underline">Tjeklisten <ArrowRight size={14} /></button>}>
                <p className="text-[14px] text-slate-500">{progress.done} af {progress.total} punkter klaret</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} /></div>
                <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {STAGES.map((s) => {
                    const items = itemsFor(s.id, kind);
                    const n = items.filter((c) => done(c.id, c.auto)).length;
                    return (
                      <li key={s.id}>
                        <button type="button" onClick={() => { setView(s.id); pick("tjekliste"); }} className={clsx("flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[14px] transition-colors hover:border-slate-300", m.stage === s.id ? "border-slate-900" : "border-slate-200")}>
                          <span className={clsx("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[12px] font-bold", n === items.length ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600")}>{n === items.length ? <Check size={12} strokeWidth={3} /> : n}</span>
                          <span className="min-w-0 flex-1 truncate font-medium">{s.label}</span>
                          <span className="text-[12px] tabular-nums text-slate-400">{n}/{items.length}</span>
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
            </div>
            <div className="space-y-5">
              <Card title="Næste opgaver" action={<button type="button" onClick={() => pick("opgaver")} className="text-[14px] font-semibold text-blue-700 hover:underline">{openTasks.length ? "Alle" : "Tilføj"}</button>}>
                {openTasks.length === 0 ? <p className="text-[15px] text-slate-500">Ingen opgaver. Planlæg fx en fremvisning.</p> : (
                  <ul className="divide-y divide-slate-100">
                    {openTasks.slice(0, 3).map((t) => {
                      const dd = t.due ? daysUntil(t.due) : null;
                      return (
                        <li key={t.id} className="flex items-baseline justify-between gap-3 py-2">
                          <span className="min-w-0 truncate text-[15px] font-medium">{t.title}</span>
                          <span className={clsx("shrink-0 text-[13px] tabular-nums", dd != null && dd < 0 ? "font-semibold text-rose-600" : dd === 0 ? "font-semibold text-blue-700" : "text-slate-500")}>{t.due ? fmtDue(t.due) : "Ingen dato"}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
              <Card title="Dit bud" action={<button type="button" onClick={() => pick("bud")} className="text-[14px] font-semibold text-blue-700 hover:underline">{m.offer ? "Åbn" : "Registrér"}</button>}>
                {m.offer ? <p className="text-[15px]"><b className="text-[20px] font-semibold tabular-nums">{kr(m.offer.amount)}</b> <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[12px] font-semibold text-slate-700">{OFFER_STATUS[m.offer.status]}</span></p> : <p className="text-[15px] text-slate-500">Intet bud endnu.</p>}
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
                ) : <p className="text-[15px] text-slate-500">Gem mæglerens navn og nummer, så har du dem ved hånden.</p>}
              </Card>
              {m.notes && (
                <Card title="Seneste note" action={<button type="button" onClick={() => pick("opgaver")} className="text-[14px] font-semibold text-blue-700 hover:underline">Noter</button>}>
                  <p className="line-clamp-4 whitespace-pre-line text-[15px] leading-relaxed text-slate-700">{m.notes}</p>
                </Card>
              )}
            </div>
          </div>
        )}

        {tab === "tjekliste" && (
          <Checklist m={m} kind={kind} view={view} setView={setView} setStage={setStage} done={done}
            toggle={(id) => persist((c) => ({ ...c, checks: { ...c.checks, [id]: !c.checks[id] } }))} rowId={row.id} goPapers={() => pick("papirer")} />
        )}

        {tab === "papirer" && (
          <div className="-mt-8">
            <Documents address={address} price={price} docs={m.docs}
              onAdd={(d) => { const check = DOC_CHECK[d.type]; persist((c) => ({ ...c, docs: [d, ...c.docs], checks: check ? { ...c.checks, [check]: true } : c.checks })); }}
              onRemove={(id) => persist((c) => ({ ...c, docs: c.docs.filter((d) => d.id !== id) }))} />
          </div>
        )}

        {tab === "opgaver" && (
          <div className="grid gap-5 lg:grid-cols-2">
            <MappeTasks tasks={m.tasks ?? []} onChange={(tasks) => persist((c) => ({ ...c, tasks }))} />
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <label htmlFor="noter" className="text-[17px] font-semibold text-slate-900">Noter</label>
              <textarea id="noter" value={m.notes} onChange={(e) => { const notes = e.target.value; persist((c) => ({ ...c, notes })); }} rows={10}
                placeholder="Fx indtryk fra fremvisningen, svar fra mægleren, bankens tilbud"
                className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-[16px] leading-relaxed text-slate-900 outline-none focus:border-blue-500 focus:bg-white" />
              <p className="mt-1.5 text-[13px] text-slate-500">Gemmes automatisk.</p>
            </div>
          </div>
        )}

        {tab === "kontakt" && <ContactForm contact={m.contact ?? {}} onChange={(contact) => persist((c) => ({ ...c, contact }))} />}

        {tab === "bud" && (
          <div className="grid gap-5 lg:grid-cols-2">
            <OfferBox offer={m.offer ?? null} price={price} onChange={(offer) => persist((c) => ({ ...c, offer, stage: offer && ["screening", "fremvisning", "dokumenter", "bank"].includes(c.stage) ? "bud" : c.stage }))} />
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <h2 className="text-[17px] font-semibold">Før du byder</h2>
              <ul className="mt-3 space-y-2.5 text-[15px] text-slate-700">
                {["Beslut dit højeste bud i analysen, før du forhandler", "Byd med advokat- og finansieringsforbehold", "Få en købers rådgiver til at læse købsaftalen"].map((t) => <li key={t} className="flex gap-2.5"><Check size={17} className="mt-0.5 shrink-0 text-emerald-600" />{t}</li>)}
              </ul>
              <Link href={`/app/analyser?saved=${row.id}`} className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 text-[14px] font-semibold hover:border-slate-400"><Calculator size={15} /> Regn på dit maks i analysen</Link>
            </div>
          </div>
        )}
      </div>

      <div className="mt-10 border-t border-slate-200 pt-5">
        {m.stage === "droppet"
          ? <button type="button" onClick={() => setStage("screening")} className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-semibold">Genåbn sagen</button>
          : <button type="button" onClick={() => setStage("droppet")} className="min-h-[44px] px-1 text-[14px] font-medium text-slate-500 hover:text-rose-600">Drop boligen</button>}
      </div>
    </div>
  );
}

function StageSelect({ value, onChange }: { value: Stage | "droppet"; onChange: (s: Stage | "droppet") => void }) {
  return (
    <span className={clsx("relative inline-flex h-10 items-center rounded-lg pl-3.5 pr-8 text-[14px] font-semibold", STAGE_TONE[value])}>
      {STAGE_LABEL[value]}
      <ChevronDown size={15} className="pointer-events-none absolute right-2.5 opacity-80" />
      <select aria-label="Fase" value={value} onChange={(e) => onChange(e.target.value as Stage | "droppet")} className="absolute inset-0 cursor-pointer opacity-0">
        {(["screening", "fremvisning", "dokumenter", "bank", "bud", "koebt", "droppet"] as const).map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
      </select>
    </span>
  );
}

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-[16px] font-semibold">{title}</h2>{action}</div>
      {children}
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
            const items = itemsFor(s.id, kind);
            const n = items.filter((c) => done(c.id, c.auto)).length;
            return (
              <li key={s.id}>
                <button type="button" onClick={() => setView(s.id)} aria-current={view === s.id ? "step" : undefined}
                  className={clsx("flex min-h-[48px] items-center gap-2 rounded-xl border px-3 text-left transition-colors", view === s.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300")}>
                  <span className={clsx("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold", n === items.length ? "bg-emerald-500 text-white" : view === s.id ? "bg-white/15" : "bg-slate-100 text-slate-600")}>{n === items.length ? <Check size={13} strokeWidth={3} /> : i + 1}</span>
                  <span><span className="block text-[14px] font-semibold leading-tight">{s.label}</span><span className={clsx("block text-[12px]", view === s.id ? "text-white/70" : "text-slate-500")}>{m.stage === s.id ? "Du er her" : `${n} af ${items.length}`}</span></span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      <section className="mt-4 rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div><h2 className="text-[18px] font-semibold">{stage.label}</h2><p className="text-[15px] text-slate-500">{stage.lead}</p></div>
          {m.stage !== view && <button type="button" onClick={() => setStage(view)} className="min-h-[44px] rounded-lg border border-slate-300 px-4 text-[14px] font-semibold hover:border-slate-400">Flyt sagen hertil</button>}
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
                    <button type="button" onClick={goPapers} className="mt-2 inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[14px] font-semibold text-slate-800 hover:border-slate-300"><Upload size={14} /> Upload og få den gennemgået</button>
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
  const field = (k: keyof Contact, label: string, type = "text", auto?: string) => (
    <div>
      <label htmlFor={`c-${k}`} className="text-[14px] font-medium text-slate-700">{label}</label>
      <input id={`c-${k}`} type={type} autoComplete={auto} value={contact[k] ?? ""} onChange={(e) => onChange({ ...contact, [k]: e.target.value.slice(0, 120) })}
        className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[16px] focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" />
    </div>
  );
  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-[17px] font-semibold"><Building2 size={18} className="text-slate-400" /> Mægler</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {field("name", "Navn", "text", "off")}
          {field("company", "Firma", "text", "off")}
          {field("phone", "Telefon", "tel", "off")}
          {field("email", "E-mail", "email", "off")}
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
        ) : <p className="mt-2 text-[15px] text-slate-500">Når du har gemt et nummer eller en mail, kan du ringe eller skrive herfra med ét tryk.</p>}
      </section>
    </div>
  );
}

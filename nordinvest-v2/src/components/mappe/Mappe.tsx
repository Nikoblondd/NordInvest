"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CalendarClock, Check, ChevronDown, Copy, ExternalLink, FileText, Gavel, Loader2, Lock, Plus, Trash2, Upload, X } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { createClient } from "@/lib/supabase/client";
import { CHECKLIST, EMPTY_MAPPE, OFFER_STATUS, STAGES, TASK_KINDS, daysUntil, fmtDue, itemsFor, type DocReview, type Kind, type Mappe as MappeData, type Offer, type Stage, type Task, type TaskKind } from "@/lib/mappe/checklist";
import { pdfPages } from "@/lib/mappe/pdf";

/*
 * The ejendomsmappe: one saved property as a case that follows the Danish
 * buying process. Stage by stage it lists what to check and where to get it,
 * reads the documents (salgsopstilling, ejerforening papers, tilstandsrapport)
 * with the risks and page references, and keeps the key numbers and notes.
 * Everything is saved on the user's own analysis row (property_data.mappe).
 */

export type MappeRow = {
  id: string;
  created_at: string;
  property_url: string | null;
  property_data: Record<string, unknown> & { address?: string; price?: number; mappe?: MappeData; propType?: string; listingUrl?: string; area?: number };
  analysis_result: { cashFlow?: number; capRate?: number; dscr?: number; cashOnCash?: number } | null;
  investment_score: number | null;
  verdict: string | null;
};

const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const num = (n: number, d = 1) => n.toLocaleString("da-DK", { minimumFractionDigits: d, maximumFractionDigits: d });

const DOC_LABEL: Record<string, string> = {
  salgsopstilling: "Salgsopstilling", tilstandsrapport: "Tilstandsrapport", elinstallationsrapport: "Elinstallationsrapport",
  vedtaegter: "Vedtægter", regnskab: "Regnskab", budget: "Budget", referat: "Referat", vedligeholdelsesplan: "Vedligeholdelsesplan",
  ejerlejlighedsskema: "Ejerlejlighedsskema", energimaerke: "Energimærke", lejekontrakt: "Lejekontrakt", andet: "Dokument",
};
// A reviewed document ticks its checklist item.
const DOC_CHECK: Record<string, string> = {
  salgsopstilling: "salgsopstilling", tilstandsrapport: "tilstand", elinstallationsrapport: "tilstand", vedtaegter: "vedtaegter",
  regnskab: "regnskab", budget: "regnskab", referat: "referater", vedligeholdelsesplan: "vedligehold", energimaerke: "energi",
};
const LEVEL = {
  hoej: { label: "Høj risiko", cls: "border-rose-200 bg-rose-50 text-rose-800", dot: "bg-rose-500" },
  middel: { label: "Værd at tjekke", cls: "border-amber-200 bg-amber-50 text-amber-900", dot: "bg-amber-500" },
  lav: { label: "Lav", cls: "border-slate-200 bg-slate-50 text-slate-700", dot: "bg-slate-400" },
} as const;

export function Mappe({ row }: { row: MappeRow }) {
  const pd = row.property_data ?? {};
  const [m, setM] = useState<MappeData>({ ...EMPTY_MAPPE, ...(pd.mappe ?? {}) });
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [view, setView] = useState<Stage>(m.stage === "droppet" ? "screening" : m.stage);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const address = pd.address || row.property_url || "Ejendom";
  const price = Number(pd.price) || 0;
  const kind: Kind | null = pd.propType === "condo" ? "lejlighed" : pd.propType === "villa" || pd.propType === "terraced" ? "hus" : null;
  const ar = row.analysis_result ?? {};

  // Debounced save into property_data.mappe, keeping everything else on the row.
  const persist = (next: MappeData) => {
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
  const toggle = (id: string) => persist({ ...m, checks: { ...m.checks, [id]: !m.checks[id] } });
  const setStage = (s: Stage | "droppet") => { persist({ ...m, stage: s }); if (s !== "droppet") setView(s); };

  const done = (id: string, auto?: string) => !!m.checks[id] || (auto === "analysis");
  const stageItems = itemsFor(view, kind);
  const progress = useMemo(() => {
    const all = CHECKLIST.filter((c) => !c.for || !kind || c.for === kind);
    return { done: all.filter((c) => done(c.id, c.auto)).length, total: all.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.checks, kind]);
  const highRisks = m.docs.flatMap((d) => d.risks.filter((r) => r.level === "hoej").map((r) => ({ ...r, doc: d.title })));
  const rentalNo = m.docs.find((d) => d.rental?.allowed === "nej" || d.rental?.allowed === "betinget");

  return (
    <div className="px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <div className="mx-auto max-w-[1080px]">
        <Link href="/dashboard" className="inline-flex min-h-[40px] items-center gap-1.5 text-[15px] font-medium text-slate-600 hover:text-slate-900"><ArrowLeft size={16} /> Mine ejendomme</Link>

        {/* Header */}
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-blue-700">Ejendomsmappe</p>
            <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.02em] text-slate-900 [text-wrap:balance] sm:text-[36px]">{address}</h1>
            <p className="mt-1 text-[15px] text-slate-600">
              {price > 0 && <>{kr(price)}</>}{pd.area ? ` · ${pd.area} m²` : ""} · {progress.done} af {progress.total} punkter klaret
            </p>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-slate-500">
            {saving === "saving" && <><Loader2 size={14} className="animate-spin" /> Gemmer</>}
            {saving === "saved" && <><Check size={14} className="text-emerald-600" /> Gemt</>}
            {saving === "error" && <span className="text-rose-600">Kunne ikke gemme</span>}
          </div>
        </div>

        {/* Stages */}
        <nav aria-label="Faser" className="-mx-4 mt-6 overflow-x-auto px-4 [scrollbar-width:none]">
          <ol className="flex min-w-max gap-2">
            {STAGES.map((s, i) => {
              const items = itemsFor(s.id, kind);
              const n = items.filter((c) => done(c.id, c.auto)).length;
              const current = m.stage === s.id;
              return (
                <li key={s.id}>
                  <button type="button" onClick={() => setView(s.id)} aria-current={view === s.id ? "step" : undefined}
                    className={clsx("flex min-h-[52px] items-center gap-2.5 rounded-xl border px-3.5 text-left transition-colors",
                      view === s.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300")}>
                    <span className={clsx("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold",
                      n === items.length ? "bg-emerald-500 text-white" : view === s.id ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600")}>
                      {n === items.length ? <Check size={14} strokeWidth={3} /> : i + 1}
                    </span>
                    <span>
                      <span className="block text-[15px] font-semibold leading-tight">{s.label}</span>
                      <span className={clsx("block text-[12px]", view === s.id ? "text-white/70" : "text-slate-500")}>{current ? "Du er her" : `${n} af ${items.length}`}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          {/* Checklist for the selected stage */}
          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <h2 className="text-[20px] font-semibold text-slate-900">{STAGES.find((s) => s.id === view)?.label}</h2>
                <p className="text-[15px] text-slate-600">{STAGES.find((s) => s.id === view)?.lead}</p>
              </div>
              {m.stage !== view && (
                <button type="button" onClick={() => setStage(view)} className="min-h-[44px] rounded-xl border border-slate-300 px-4 text-[15px] font-semibold text-slate-900 hover:border-slate-400">
                  Flyt sagen hertil
                </button>
              )}
            </div>
            <ul className="divide-y divide-slate-100">
              {stageItems.map((c) => {
                const ok = done(c.id, c.auto);
                return (
                  <li key={c.id} className="flex gap-3.5 px-5 py-4 sm:px-6">
                    <button type="button" role="checkbox" aria-checked={ok} disabled={!!c.auto} onClick={() => toggle(c.id)} aria-label={c.title}
                      className={clsx("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition-colors",
                        ok ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white hover:border-slate-400")}>
                      {ok && <Check size={16} strokeWidth={3} />}
                    </button>
                    <div className="min-w-0">
                      <p className={clsx("text-[16px] font-semibold", ok ? "text-slate-500" : "text-slate-900")}>{c.title}</p>
                      <p className="mt-0.5 text-[15px] leading-relaxed text-slate-600">{c.why}</p>
                      {c.where && (
                        c.where.href
                          ? <a href={c.where.href} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[14px] font-semibold text-blue-700 hover:underline">{c.where.label} <ExternalLink size={13} /></a>
                          : c.where.label === "Analysen" || c.where.label.startsWith("Analysen") || c.where.label.startsWith("Juster") || c.where.label.startsWith("Bankrapport")
                            ? <Link href={`/analyseren?saved=${row.id}`} className="mt-1.5 inline-flex items-center gap-1 text-[14px] font-semibold text-blue-700 hover:underline">{c.where.label} →</Link>
                            : <p className="mt-1.5 text-[14px] text-slate-500">Hvor: {c.where.label}</p>
                      )}
                      {c.stage === "dokumenter" && c.id !== "energi" && !ok && (
                        <a href="#dokumenter" className="mt-2 inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[14px] font-semibold text-slate-800 hover:border-slate-300"><Upload size={14} /> Upload og få den gennemgået</a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Side: numbers, red flags, notes */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <div className="flex items-center justify-between">
                <h2 className="text-[17px] font-semibold text-slate-900">Tallene</h2>
                <Link href={`/analyseren?saved=${row.id}`} className="text-[14px] font-semibold text-blue-700 hover:underline">Åbn analysen →</Link>
              </div>
              <dl className="mt-3 divide-y divide-slate-100 text-[15px]">
                {ar.cashFlow != null && <Row k="Overskud pr. md." v={`${ar.cashFlow >= 0 ? "+" : "−"}${kr(Math.abs(ar.cashFlow))}`} tone={ar.cashFlow >= 0 ? "text-emerald-700" : "text-rose-600"} />}
                {ar.capRate != null && <Row k="Afkast af prisen" v={`${num(ar.capRate)} %`} />}
                {ar.dscr != null && <Row k="Lejen dækker lånet" v={`${num(ar.dscr, 2)} gange`} />}
                {row.investment_score != null && <Row k="Score" v={`${row.investment_score} af 100`} />}
              </dl>
            </div>

            <Tasks tasks={m.tasks ?? []} onChange={(tasks) => persist({ ...m, tasks })} />
            <OfferBox offer={m.offer ?? null} price={price} onChange={(offer) => persist({ ...m, offer, stage: offer && (m.stage === "screening" || m.stage === "fremvisning" || m.stage === "dokumenter" || m.stage === "bank") ? "bud" : m.stage })} />

            {(highRisks.length > 0 || rentalNo) && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
                <h2 className="flex items-center gap-2 text-[17px] font-semibold text-rose-900"><AlertTriangle size={18} /> Røde flag fra papirerne</h2>
                <ul className="mt-2 space-y-2 text-[15px] text-rose-900">
                  {rentalNo && <li><b className="font-semibold">Udlejning:</b> {rentalNo.rental?.note}</li>}
                  {highRisks.slice(0, 4).map((r, i) => <li key={i}><b className="font-semibold">{r.title}.</b> {r.detail}</li>)}
                </ul>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <label htmlFor="noter" className="text-[17px] font-semibold text-slate-900">Noter</label>
              <textarea id="noter" value={m.notes} onChange={(e) => persist({ ...m, notes: e.target.value })} rows={5}
                placeholder="Fx svar fra mægleren, indtryk fra fremvisningen, bankens tilbud…"
                className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-[16px] leading-relaxed text-slate-900 outline-none focus:border-blue-500 focus:bg-white" />
            </div>

            <div className="flex flex-wrap gap-2">
              {m.stage === "droppet"
                ? <button type="button" onClick={() => setStage("screening")} className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 text-[15px] font-semibold text-slate-900">Genåbn sagen</button>
                : <button type="button" onClick={() => setStage("droppet")} className="min-h-[44px] rounded-xl px-2 text-[15px] font-medium text-slate-500 hover:text-slate-800">Drop boligen</button>}
              {m.stage === "droppet" && <span className="self-center text-[14px] text-slate-500">Sagen er markeret som droppet.</span>}
            </div>
          </aside>
        </div>

        <Documents address={address} price={price} docs={m.docs}
          onAdd={(d) => {
            const check = DOC_CHECK[d.type];
            persist({ ...m, docs: [d, ...m.docs], checks: check ? { ...m.checks, [check]: true } : m.checks });
          }}
          onRemove={(id) => persist({ ...m, docs: m.docs.filter((d) => d.id !== id) })} />
      </div>
    </div>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt className="text-slate-600">{k}</dt>
      <dd className={clsx("font-semibold tabular-nums", tone ?? "text-slate-900")}>{v}</dd>
    </div>
  );
}

/* ---------------- Documents ---------------- */

function Documents({ address, price, docs, onAdd, onRemove }: { address: string; price: number; docs: DocReview[]; onAdd: (d: DocReview) => void; onRemove: (id: string) => void }) {
  const [state, setState] = useState<{ step: "idle" | "reading" | "review" | "error"; msg?: string }>({ step: "idle" });
  const input = useRef<HTMLInputElement>(null);

  const run = async (file: File) => {
    if (!/pdf$/i.test(file.type) && !/\.pdf$/i.test(file.name)) return setState({ step: "error", msg: "Vælg en PDF-fil." });
    try {
      setState({ step: "reading" });
      const pages = await pdfPages(file);
      if (pages.join("").replace(/\s/g, "").length < 200) return setState({ step: "error", msg: "PDF'en indeholder ingen tekst, vi kan læse. Den er måske scannet som billeder. Bed mægleren om en tekst-PDF." });
      setState({ step: "review" });
      const res = await fetch("/api/mappe/dokument", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: file.name, pages, address, price }) });
      const d = await res.json().catch(() => ({}));
      if (!d?.ok) {
        const msg = d?.reason === "login" ? "Log ind for at få dokumenter gennemgået." : d?.reason === "no_text" ? "Der var for lidt tekst i dokumentet." : "Gennemgangen mislykkedes. Prøv igen om lidt.";
        return setState({ step: "error", msg });
      }
      onAdd({ id: `${file.name}-${pages.length}-${Date.now()}`, name: file.name, pages: pages.length, at: new Date().toISOString(), ...d.review });
      setState({ step: "idle" });
    } catch {
      setState({ step: "error", msg: "Kunne ikke læse PDF'en." });
    }
  };

  return (
    <section id="dokumenter" className="mt-8 scroll-mt-24">
      <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-slate-900 sm:text-[28px]">Dokumenterne</h2>
      <p className="mt-1.5 max-w-2xl text-[16px] text-slate-600">
        Upload salgsopstillingen, tilstandsrapporten eller ejerforeningens papirer. AI&apos;en læser dem og viser tallene, risiciene med sidetal og de spørgsmål, du bør stille.
      </p>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) run(f); }}
        className="mt-4 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-5 text-center sm:p-7"
      >
        {state.step === "reading" || state.step === "review" ? (
          <p className="flex items-center justify-center gap-2.5 text-[16px] font-medium text-slate-700">
            <Loader2 size={18} className="animate-spin text-blue-600" />
            {state.step === "reading" ? "Læser PDF'en…" : "AI'en gennemgår dokumentet. Det tager op til et minut."}
          </p>
        ) : (
          <>
            <button type="button" onClick={() => input.current?.click()} className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-blue-600 px-5 text-[16px] font-semibold text-white shadow-btn hover:bg-blue-500 active:translate-y-px">
              <Upload size={18} /> Vælg PDF
            </button>
            <p className="mt-2 hidden text-[14px] text-slate-500 sm:block">eller træk filen herind</p>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[13px] text-slate-500"><Lock size={13} /> Filen bliver på din computer. Kun teksten sendes til gennemgang.</p>
          </>
        )}
        {state.step === "error" && <p className="mt-3 text-[15px] font-medium text-rose-700">{state.msg}</p>}
        <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) run(f); e.target.value = ""; }} />
      </div>

      <div className="mt-5 space-y-4">
        {docs.map((d) => <DocCard key={d.id} d={d} onRemove={() => onRemove(d.id)} />)}
      </div>
    </section>
  );
}

function DocCard({ d, onRemove }: { d: DocReview; onRemove: () => void }) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (!copied) return; const t = setTimeout(() => setCopied(false), 1800); return () => clearTimeout(t); }, [copied]);
  const counts = { hoej: d.risks.filter((r) => r.level === "hoej").length, middel: d.risks.filter((r) => r.level === "middel").length };
  const rentalTone = d.rental?.allowed === "ja" ? "text-emerald-700" : d.rental?.allowed === "nej" ? "text-rose-700" : "text-amber-800";

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <header className="flex items-start gap-3 px-5 py-4 sm:px-6">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100"><FileText size={19} strokeWidth={1.8} /></span>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="min-w-0 flex-1 text-left">
          <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-slate-500">{DOC_LABEL[d.type] ?? "Dokument"} · {d.pages} sider</p>
          <h3 className="text-[18px] font-semibold leading-snug text-slate-900">{d.title}</h3>
          <p className="mt-1 flex flex-wrap gap-x-3 text-[14px]">
            {counts.hoej > 0 && <span className="font-semibold text-rose-700">{counts.hoej} høj risiko</span>}
            {counts.middel > 0 && <span className="font-semibold text-amber-800">{counts.middel} værd at tjekke</span>}
            {counts.hoej + counts.middel === 0 && <span className="font-semibold text-emerald-700">Ingen større risici fundet</span>}
          </p>
        </button>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-label={open ? "Fold sammen" : "Fold ud"} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"><ChevronDown size={18} className={open ? "rotate-180" : ""} /></button>
      </header>

      {open && (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4 sm:px-6">
          {d.summary && <p className="text-[16px] leading-relaxed text-slate-800">{d.summary}</p>}

          {d.rental && d.rental.allowed !== "ukendt" && (
            <p className={clsx("mt-3 text-[15px] font-semibold", rentalTone)}>
              Udlejning: {d.rental.allowed === "ja" ? "tilladt" : d.rental.allowed === "nej" ? "ikke tilladt" : "med betingelser"}. <span className="font-normal text-slate-700">{d.rental.note}{d.rental.page ? ` (side ${d.rental.page})` : ""}</span>
            </p>
          )}

          {d.risks.length > 0 && (
            <ul className="mt-4 space-y-2.5">
              {d.risks.map((r, i) => (
                <li key={i} className={clsx("rounded-xl border px-4 py-3", LEVEL[r.level].cls)}>
                  <p className="flex items-center gap-2 text-[15px] font-semibold"><span className={clsx("h-2 w-2 shrink-0 rounded-full", LEVEL[r.level].dot)} />{r.title}</p>
                  <p className="mt-1 text-[15px] leading-relaxed">{r.detail}</p>
                  {(r.quote || r.page) && <p className="mt-1.5 text-[13px] opacity-80">{r.page ? `Side ${r.page}` : ""}{r.quote ? `${r.page ? ": " : ""}“${r.quote}”` : ""}</p>}
                </li>
              ))}
            </ul>
          )}

          {d.facts.length > 0 && (
            <dl className="mt-4 grid gap-x-6 sm:grid-cols-2">
              {d.facts.map((f, i) => (
                <div key={i} className="flex items-baseline justify-between gap-3 border-b border-slate-100 py-2 text-[15px]">
                  <dt className="text-slate-600">{f.label}</dt>
                  <dd className="text-right font-semibold tabular-nums text-slate-900">{f.value}{f.page ? <span className="ml-1.5 text-[12px] font-normal text-slate-400">s. {f.page}</span> : null}</dd>
                </div>
              ))}
            </dl>
          )}

          {d.questions.length > 0 && (
            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[15px] font-semibold text-slate-900">Spørg mægleren eller foreningen</p>
                <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(d.questions.map((q) => `- ${q}`).join("\n")); setCopied(true); } catch { /* ignore */ } }}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2 text-[14px] font-semibold text-blue-700 hover:bg-blue-50">
                  {copied ? <><Check size={14} /> Kopieret</> : <><Copy size={14} /> Kopiér</>}
                </button>
              </div>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-800">
                {d.questions.map((q, i) => <li key={i}>{q}</li>)}
              </ol>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3 text-[13px] text-slate-500">
            <span>{d.name} · gennemgået {new Date(d.at).toLocaleDateString("da-DK", { day: "numeric", month: "long" })} · AI kan tage fejl, så tjek altid med din rådgiver.</span>
            <button type="button" onClick={onRemove} className="inline-flex min-h-[40px] shrink-0 items-center gap-1 rounded-lg px-2 font-medium text-slate-500 hover:text-rose-600"><X size={14} /> Fjern</button>
          </div>
        </div>
      )}
    </article>
  );
}


/* ---------------- Tasks ---------------- */

function Tasks({ tasks, onChange }: { tasks: Task[]; onChange: (t: Task[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<TaskKind>("fremvisning");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const open = tasks.filter((t) => !t.done).sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
  const done = tasks.filter((t) => t.done);
  const add = () => {
    const label = title.trim() || TASK_KINDS.find((k) => k.id === kind)!.label;
    const due = date ? (time ? `${date}T${time}` : date) : null;
    onChange([...tasks, { id: `t${Date.now()}`, kind, title: label, due, done: false }]);
    setTitle(""); setDate(""); setTime(""); setAdding(false);
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[17px] font-semibold text-slate-900"><CalendarClock size={18} strokeWidth={1.8} className="text-slate-500" /> Opgaver</h2>
        {!adding && <button type="button" onClick={() => setAdding(true)} className="inline-flex min-h-[40px] items-center gap-1 rounded-lg px-2 text-[14px] font-semibold text-blue-700 hover:bg-blue-50"><Plus size={15} /> Tilføj</button>}
      </div>
      {adding && (
        <div className="mt-3 space-y-2.5 rounded-xl bg-slate-50 p-3">
          <select value={kind} onChange={(e) => setKind(e.target.value as TaskKind)} aria-label="Type" className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[16px]">
            {TASK_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Beskrivelse (valgfri)" className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[16px]" />
          <div className="grid grid-cols-[1.4fr_1fr] gap-2">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Dato" className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-[16px]" />
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Tidspunkt" className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-[16px]" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={add} className="min-h-[44px] flex-1 rounded-lg bg-slate-900 text-[15px] font-semibold text-white">Gem opgave</button>
            <button type="button" onClick={() => setAdding(false)} className="min-h-[44px] rounded-lg px-3 text-[15px] font-medium text-slate-600">Annullér</button>
          </div>
        </div>
      )}
      {open.length === 0 && !adding && <p className="mt-2 text-[15px] text-slate-500">Ingen opgaver. Tilføj fx en fremvisning eller et opkald til mægleren.</p>}
      <ul className="mt-2 divide-y divide-slate-100">
        {open.map((t) => {
          const dd = t.due ? daysUntil(t.due) : null;
          return (
            <li key={t.id} className="flex items-start gap-3 py-2.5">
              <button type="button" role="checkbox" aria-checked={false} aria-label={`Marker ${t.title} som klaret`} onClick={() => onChange(tasks.map((x) => (x.id === t.id ? { ...x, done: true } : x)))}
                className="mt-0.5 h-6 w-6 shrink-0 rounded-full border-2 border-slate-300 hover:border-emerald-500" />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-slate-900">{t.title}</p>
                {t.due && <p className={clsx("text-[13px]", dd! < 0 ? "font-semibold text-rose-600" : dd === 0 ? "font-semibold text-blue-700" : "text-slate-500")}>{dd! < 0 ? "Overskredet · " : dd === 0 ? "I dag · " : dd === 1 ? "I morgen · " : ""}{fmtDue(t.due)}</p>}
              </div>
              <button type="button" aria-label="Slet opgave" onClick={() => onChange(tasks.filter((x) => x.id !== t.id))} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-rose-600"><Trash2 size={14} /></button>
            </li>
          );
        })}
      </ul>
      {done.length > 0 && <p className="mt-1 text-[13px] text-slate-500">{done.length} klaret</p>}
    </div>
  );
}

/* ---------------- Offer ---------------- */

function OfferBox({ offer, price, onChange }: { offer: Offer | null; price: number; onChange: (o: Offer | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(offer?.amount ? String(offer.amount) : "");
  const save = () => {
    const n = Number(amount.replace(/[^0-9]/g, ""));
    if (!n) return;
    onChange({ amount: n, date: new Date().toISOString().slice(0, 10), status: offer?.status ?? "afgivet" });
    setEditing(false);
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="flex items-center gap-2 text-[17px] font-semibold text-slate-900"><Gavel size={18} strokeWidth={1.8} className="text-slate-500" /> Dit bud</h2>
      {offer && !editing ? (
        <div className="mt-2">
          <p className="text-[24px] font-semibold tabular-nums text-slate-900">{kr(offer.amount)}</p>
          {price > 0 && <p className="text-[14px] text-slate-500">{Math.round(((price - offer.amount) / price) * 1000) / 10} % under udbudsprisen · afgivet {new Date(offer.date).toLocaleDateString("da-DK", { day: "numeric", month: "short" })}</p>}
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {(Object.keys(OFFER_STATUS) as Offer["status"][]).map((st) => (
              <button key={st} type="button" onClick={() => onChange({ ...offer, status: st })}
                className={clsx("min-h-[40px] rounded-lg border text-[14px] font-semibold", offer.status === st ? (st === "accepteret" ? "border-emerald-500 bg-emerald-50 text-emerald-800" : st === "afslaaet" ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-900 bg-slate-900 text-white") : "border-slate-200 text-slate-600")}>
                {OFFER_STATUS[st]}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-3 text-[14px]">
            <button type="button" onClick={() => setEditing(true)} className="font-semibold text-blue-700">Ret beløb</button>
            <button type="button" onClick={() => onChange(null)} className="font-medium text-slate-500 hover:text-rose-600">Fjern</button>
          </div>
        </div>
      ) : editing || !offer ? (
        editing ? (
          <div className="mt-2 flex gap-2">
            <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={price ? String(Math.round(price * 0.95 / 5000) * 5000) : "Beløb i kr."} className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-[16px] tabular-nums" />
            <button type="button" onClick={save} className="min-h-[44px] rounded-lg bg-slate-900 px-4 text-[15px] font-semibold text-white">Gem</button>
          </div>
        ) : (
          <button type="button" onClick={() => setEditing(true)} className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 text-[15px] font-semibold text-slate-900 hover:border-slate-400"><Plus size={15} /> Registrér et bud</button>
        )
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Hammer, Plus, Trash2, ChevronDown, Sparkles, Wand2, Loader2, BadgeCheck } from "lucide-react";
import { monthlyPayment, kr, krMd, num } from "@/lib/analysis";
import { clsx } from "@/lib/clsx";

type Item = { id: string; label: string; cost: number };

let seq = 0;
const uid = () => `r${++seq}`;

type AiAnalysis = {
  overallCondition: number;
  conditionLabel: string | null;
  rooms: { room: string; condition: number; note: string }[];
  renovationItems: { label: string; costLow: number; costHigh: number; priority: string }[];
  rentUpliftPct: number;
  valueUpliftPct: number;
  confidence: number;
  summary: string | null;
};

export type RenovationSnapshot = {
  active: boolean;
  totalReno: number;
  arv: number;
  newRent: number;
  refiLtv: number;
  valueCreated: number;
  refiLoan: number;
  pulledOut: number;
  leftIn: number;
  newPayment: number;
  cashFlowAfter: number;
  cashOnCashAfter: number | null;
  recycledPct: number;
  items: { label: string; cost: number }[];
  ai: {
    overallCondition: number;
    conditionLabel: string | null;
    confidence: number;
    summary: string | null;
    rentUpliftPct: number;
    valueUpliftPct: number;
  } | null;
};

// Fase 1 — Renoveringsmotoren: turns a renovation budget into value-add / BRRR
// numbers (ARV, refinance, capital pulled out, return after refi). This is the
// calculation layer the AI photo-analyser (Fase 2) will later auto-fill.
export function RenovationModule({
  price,
  downPaymentPct,
  interestRate,
  termYears,
  monthlyRent,
  monthlyOpex,
  images = [],
  address = null,
  byggeaar = null,
  area = null,
  rooms = null,
  onSnapshot,
}: {
  price: number;
  downPaymentPct: number;
  interestRate: number;
  termYears: number;
  monthlyRent: number;
  monthlyOpex: number;
  images?: string[];
  address?: string | null;
  byggeaar?: number | null;
  area?: number | null;
  rooms?: number | null;
  // Reports the current renovation / BRRRR + AI-condition numbers up so the
  // Analytikeren chatbot can answer questions about everything on screen.
  onSnapshot?: (snap: RenovationSnapshot | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [ai, setAi] = useState<{ status: "idle" | "analyzing" | "done" | "error" | "noimg" | "noconfig"; result?: AiAnalysis }>({ status: "idle" });
  const [items, setItems] = useState<Item[]>([
    { id: uid(), label: "Køkken", cost: 0 },
    { id: uid(), label: "Bad", cost: 0 },
    { id: uid(), label: "Maling & gulv", cost: 0 },
  ]);
  const [refiLtv, setRefiLtv] = useState(80);
  const [arvTouched, setArvTouched] = useState(false);
  const [arv, setArv] = useState<number>(0);
  const [newRent, setNewRent] = useState<number>(monthlyRent);
  const [rentTouched, setRentTouched] = useState(false);

  const totalReno = useMemo(() => items.reduce((s, i) => s + (i.cost || 0), 0), [items]);

  // Sensible defaults until the user overrides them.
  const effArv = arvTouched ? arv : Math.round(price + totalReno);
  const effRent = rentTouched ? newRent : monthlyRent;

  const r = useMemo(() => {
    const originalLoan = price * (1 - downPaymentPct / 100);
    const downPayment = price * (downPaymentPct / 100);
    const cashInvested = downPayment + totalReno;
    const valueCreated = effArv - (price + totalReno);
    const refiLoan = effArv * (refiLtv / 100);
    const pulledOut = Math.max(0, refiLoan - originalLoan);
    const leftIn = Math.max(0, cashInvested - pulledOut);
    const newPay = monthlyPayment(refiLoan, interestRate, termYears);
    const cfMonth = effRent - newPay - monthlyOpex;
    const cocAfter = leftIn > 500 ? (cfMonth * 12) / leftIn * 100 : Infinity;
    const recycledPct = cashInvested > 0 ? Math.min(100, (pulledOut / cashInvested) * 100) : 0;
    return { originalLoan, cashInvested, valueCreated, refiLoan, pulledOut, leftIn, newPay, cfMonth, cocAfter, recycledPct };
  }, [price, downPaymentPct, interestRate, termYears, monthlyOpex, totalReno, effArv, effRent, refiLtv]);

  // Report the live BRRRR + AI numbers up so the chatbot can read them. Active
  // only once the user has entered renovation costs or run the AI analysis.
  const aiResult = ai.result ?? null;
  useEffect(() => {
    if (!onSnapshot) return;
    const active = totalReno > 0 || ai.status === "done";
    if (!active) { onSnapshot(null); return; }
    onSnapshot({
      active,
      totalReno,
      arv: effArv,
      newRent: effRent,
      refiLtv,
      valueCreated: Math.round(r.valueCreated),
      refiLoan: Math.round(r.refiLoan),
      pulledOut: Math.round(r.pulledOut),
      leftIn: Math.round(r.leftIn),
      newPayment: Math.round(r.newPay),
      cashFlowAfter: Math.round(r.cfMonth),
      cashOnCashAfter: Number.isFinite(r.cocAfter) ? Math.round(r.cocAfter * 10) / 10 : null,
      recycledPct: Math.round(r.recycledPct),
      items: items.filter((i) => i.cost > 0).map((i) => ({ label: i.label, cost: i.cost })),
      ai: aiResult
        ? {
            overallCondition: aiResult.overallCondition,
            conditionLabel: aiResult.conditionLabel,
            confidence: aiResult.confidence,
            summary: aiResult.summary,
            rentUpliftPct: aiResult.rentUpliftPct,
            valueUpliftPct: aiResult.valueUpliftPct,
          }
        : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalReno, effArv, effRent, refiLtv, r, ai.status, aiResult]);

  const set = (id: string, patch: Partial<Item>) =>
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  // Fase 2 — AI reads the listing photos and PRE-FILLS the fields below.
  // Everything stays editable: the model assists, the human decides.
  const runAi = async () => {
    if (!images || images.length === 0) return setAi({ status: "noimg" });
    setAi({ status: "analyzing" });
    try {
      const res = await fetch("/api/property/condition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images, address, byggeaar, area, rooms }),
      });
      const d = await res.json();
      if (!d.ok) {
        setAi({ status: d.reason === "no_images" ? "noimg" : d.reason === "not_configured" ? "noconfig" : "error" });
        return;
      }
      const a = d.analysis as AiAnalysis;
      if (a.renovationItems.length) {
        setItems(a.renovationItems.map((it) => ({ id: uid(), label: it.label, cost: Math.round((it.costLow + it.costHigh) / 2) })));
      }
      if (a.valueUpliftPct > 0) { setArv(Math.round(price * (1 + a.valueUpliftPct / 100))); setArvTouched(true); }
      if (a.rentUpliftPct > 0) { setNewRent(Math.round(monthlyRent * (1 + a.rentUpliftPct / 100))); setRentTouched(true); }
      setAi({ status: "done", result: a });
    } catch {
      setAi({ status: "error" });
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 p-5 text-left">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <Hammer size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-900">Istandsættelse &amp; value-add (BRRR)</span>
          <span className="block text-xs text-slate-500">
            Regn renovering om til værdiskabelse, refinansiering og afkast — som et proff.
          </span>
        </span>
        {totalReno > 0 && <span className="mr-1 hidden text-sm font-semibold text-slate-700 tnum sm:block">{kr(totalReno)}</span>}
        <ChevronDown size={18} className={clsx("shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="border-t border-slate-100 p-5">
          {/* Fase 2 — AI photo analysis */}
          {ai.status === "done" && ai.result ? (
            <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <BadgeCheck size={17} className="text-blue-600" />
                <span className="text-sm font-semibold text-slate-900">AI-fotoanalyse</span>
                <ConfidencePill c={ai.result.confidence} />
                <span className="text-sm text-slate-500">
                  Stand: <b className="text-slate-700">{ai.result.overallCondition}/5</b>
                  {ai.result.conditionLabel ? ` · ${ai.result.conditionLabel}` : ""}
                </span>
                <button onClick={runAi} className="ml-auto text-xs font-semibold text-blue-600 hover:text-blue-700">Analysér igen</button>
              </div>
              {ai.result.summary && <p className="mt-2 text-sm leading-relaxed text-slate-600">{ai.result.summary}</p>}
              <p className="mt-2 text-xs text-slate-400">
                Posterne herunder er forudfyldt ud fra billederne — <b>ret dem frit</b>. AI hjælper, du bestemmer.
              </p>
            </div>
          ) : (
            <div className="mb-5 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-900">Lad AI vurdere standen ud fra fotos</div>
                <div className="text-xs text-slate-500">
                  Læser annoncens billeder, scorer standen og foreslår renoveringsposter med danske priser — forankret i BBR-data.
                </div>
                {ai.status === "noimg" && <div className="mt-1 text-xs text-amber-600">Ingen brugbare fotos fundet på annoncen.</div>}
                {ai.status === "noconfig" && <div className="mt-1 text-xs text-amber-600">AI-analyse er ikke aktiveret endnu.</div>}
                {ai.status === "error" && <div className="mt-1 text-xs text-rose-600">Kunne ikke analysere lige nu. Prøv igen.</div>}
              </div>
              <button
                onClick={runAi}
                disabled={ai.status === "analyzing"}
                className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
              >
                {ai.status === "analyzing" ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                {ai.status === "analyzing" ? "Analyserer fotos…" : "Analysér fotos med AI"}
              </button>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
            {/* INPUTS */}
            <div>
              <div className="text-[13px] font-semiboldr text-slate-400">Istandsættelse</div>
              <div className="mt-3 space-y-2">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center gap-2">
                    <input
                      value={it.label}
                      onChange={(e) => set(it.id, { label: e.target.value })}
                      placeholder="Post"
                      className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
                    />
                    <div className="flex items-center rounded-lg border border-slate-200 bg-white focus-within:border-blue-500">
                      <input
                        type="number"
                        value={it.cost || ""}
                        onChange={(e) => set(it.id, { cost: Number(e.target.value) })}
                        placeholder="0"
                        className="w-24 rounded-lg bg-transparent px-2 py-1.5 text-right text-sm font-semibold text-slate-900 tnum outline-none"
                      />
                      <span className="pr-2 text-xs text-slate-400">kr</span>
                    </div>
                    <button onClick={() => setItems((xs) => xs.filter((x) => x.id !== it.id))} aria-label="Fjern" className="shrink-0 text-slate-300 hover:text-rose-500">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setItems((xs) => [...xs, { id: uid(), label: "", cost: 0 }])}
                className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                <Plus size={14} /> Tilføj post
              </button>

              <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-500">Renovering i alt</span>
                <span className="font-bold text-slate-900 tnum">{kr(totalReno)}</span>
              </div>

              <div className="mt-5 space-y-4">
                <Field label="Vurdering efter renovering (ARV)" suffix="kr" value={effArv} onChange={(n) => { setArv(n); setArvTouched(true); }} step={25000} />
                <Field label="Leje efter renovering" suffix="kr/md." value={effRent} onChange={(n) => { setNewRent(n); setRentTouched(true); }} step={250} />
                <Field label="Belåning ved refinansiering" suffix="%" value={refiLtv} onChange={setRefiLtv} />
              </div>
            </div>

            {/* RESULTS */}
            <div>
              <div className="flex items-center gap-2 text-[13px] font-semiboldr text-slate-400">
                <Sparkles size={13} className="text-amber-500" /> Efter renovering
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat label="Værdiskabelse" value={kr(r.valueCreated)} tone={r.valueCreated >= 0 ? "text-emerald-600" : "text-rose-500"} />
                <Stat label="Nyt lån (refi)" value={kr(r.refiLoan)} />
                <Stat label="Udtrukket kapital" value={kr(r.pulledOut)} tone="text-emerald-600" />
                <Stat label="Bunden kapital" value={kr(r.leftIn)} hint="efter refinansiering" />
                <Stat label="Kapital genbrugt" value={num(r.recycledPct, 0) + " %"} />
                <Stat
                  label="Cash-on-cash"
                  value={isFinite(r.cocAfter) ? num(r.cocAfter) + " %" : "∞"}
                  tone={isFinite(r.cocAfter) && r.cocAfter < 0 ? "text-rose-500" : "text-emerald-600"}
                  hint="efter refi"
                />
                <Stat label="Cash flow / md." value={krMd(r.cfMonth)} tone={r.cfMonth >= 0 ? "text-emerald-600" : "text-rose-500"} />
                <Stat label="Ny ydelse" value={krMd(r.newPay)} />
                <Stat label="Samlet investeret" value={kr(r.cashInvested)} hint="udbetaling + reno" />
              </div>

              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm leading-relaxed text-amber-900">
                <b>Sådan læser du det:</b> BRRR handler om at renovere så meget værdi frem, at du kan låne penge ud igen ved
                at refinansiere — og genbruge din kapital til næste bolig.{" "}
                {r.cocAfter === Infinity
                  ? "Her får du hele din kapital ud: uendeligt afkast på de penge, der er tilbage i handlen."
                  : r.pulledOut > 0
                  ? `Du får ${kr(r.pulledOut)} tilbage og har kun ${kr(r.leftIn)} bundet — resten arbejder videre.`
                  : "Endnu ingen kapital udtrukket — hæv ARV eller renovér mere målrettet for at frigøre penge."}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfidencePill({ c }: { c: number }) {
  const pct = Math.round(c * 100);
  const tone = c >= 0.7 ? "bg-emerald-100 text-emerald-700" : c >= 0.4 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-600";
  const label = c >= 0.7 ? "høj sikkerhed" : c >= 0.4 ? "middel sikkerhed" : "lav sikkerhed";
  return <span className={clsx("rounded-full px-2 py-0.5 text-xs font-semibold", tone)}>{pct}% · {label}</span>;
}

function Field({ label, suffix, value, onChange, step = 1 }: {
  label: string; suffix: string; value: number; onChange: (n: number) => void; step?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="mt-1 flex items-center rounded-xl border border-slate-200 bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
        <input type="number" value={value} step={step} onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-xl bg-transparent px-3 py-2.5 font-semibold text-slate-900 tnum outline-none" />
        <span className="px-3 text-sm text-slate-400">{suffix}</span>
      </div>
    </label>
  );
}

function Stat({ label, value, tone = "text-slate-900", hint }: { label: string; value: string; tone?: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-medium leading-tight text-slate-500">{label}</div>
      <div className={clsx("mt-1 whitespace-nowrap text-xl font-bold tnum", tone)}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

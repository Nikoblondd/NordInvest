"use client";

import { useState } from "react";
import { Loader2, Check, Target } from "lucide-react";
import { loadSupabase } from "@/lib/supabase/lazy";

// Lets an owner report what ACTUALLY happened on a deal — the data the model
// learns from. Only shown for a saved analysis (we have its id + predictions).
export function OutcomeForm({
  analysisId,
  region,
  predicted,
}: {
  analysisId: string;
  region: string | null;
  predicted: { price?: number; monthlyRent?: number; appreciationPct?: number };
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "done" | "login" | "error">("idle");
  const [rent, setRent] = useState("");
  const [sale, setSale] = useState("");
  const [cashflow, setCashflow] = useState("");
  const [months, setMonths] = useState("");
  const [notes, setNotes] = useState("");

  const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(/\./g, "").replace(",", ".")));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("saving");
    const supabase = await loadSupabase();
    if (!supabase) return setState("login");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setState("login");
    const { error } = await supabase.from("analysis_outcomes").insert({
      user_id: user.id,
      analysis_id: analysisId,
      region: region ?? null,
      predicted,
      actual_monthly_rent: num(rent),
      actual_sale_price: num(sale),
      actual_monthly_cashflow: num(cashflow),
      months_held: months ? parseInt(months, 10) : null,
      notes: notes || null,
    });
    setState(error ? "error" : "done");
  };

  if (state === "done") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <Check className="mx-auto text-emerald-600" size={26} />
        <p className="mt-2 font-semibold text-emerald-900">Tak — det gør en reel forskel.</p>
        <p className="mt-1 text-sm text-emerald-700">
          Dine faktiske tal er nu en del af NordInvest-hjernen og gør fremtidige analyser skarpere.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      {!open ? (
        <button onClick={() => setOpen(true)} className="flex w-full items-center gap-3 text-left">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Target size={20} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-900">Har du købt eller solgt? Registrér det faktiske resultat</span>
            <span className="block text-xs text-slate-500">Dine rigtige tal træner modellen — og gør din næste analyse mere præcis.</span>
          </span>
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="text-sm font-semibold text-slate-900">Hvad skete der i virkeligheden?</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Faktisk månedlig leje" suffix="kr/md." value={rent} onChange={setRent} placeholder={predicted.monthlyRent ? String(predicted.monthlyRent) : ""} />
            <Field label="Faktisk cash flow" suffix="kr/md." value={cashflow} onChange={setCashflow} />
            <Field label="Faktisk salgspris" suffix="kr" value={sale} onChange={setSale} placeholder={predicted.price ? String(predicted.price) : ""} />
            <Field label="Ejerperiode" suffix="mdr." value={months} onChange={setMonths} />
          </div>
          <label className="block">
            <span className="text-sm text-slate-600">Kommentar (valgfrit)</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
          </label>
          {state === "login" && <p className="text-xs text-rose-600">Log ind for at bidrage med data.</p>}
          {state === "error" && <p className="text-xs text-rose-600">Kunne ikke gemme. Prøv igen.</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={state === "saving"}
              className="flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              {state === "saving" ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Gem resultat
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-sm font-medium text-slate-500 hover:text-slate-800">Annullér</button>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({ label, suffix, value, onChange, placeholder }: {
  label: string; suffix: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="mt-1 flex items-center rounded-xl border border-slate-200 bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
        <input inputMode="numeric" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl bg-transparent px-3 py-2 text-sm font-semibold text-slate-900 tnum outline-none" />
        <span className="px-3 text-xs text-slate-400">{suffix}</span>
      </div>
    </label>
  );
}

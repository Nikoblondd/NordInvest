"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { captureEvent } from "@/lib/analytics-events";

/*
 * One click on whether the numbers hit, then optional details. This is the
 * feedback the flip model is tuned on, from people who actually flip.
 */

const VERDICTS = [
  { v: "right", label: "Tallene ser rigtige ud" },
  { v: "arv", label: "Salgsprisen er forkert" },
  { v: "reno", label: "Renoveringen er forkert" },
  { v: "missing", label: "Der mangler noget" },
];
const ROLES = [
  { v: "flipper", label: "Jeg flipper selv" },
  { v: "considering", label: "Overvejer det" },
  { v: "tradesman", label: "Håndværker" },
  { v: "advisor", label: "Bank eller rådgiver" },
];

export function FlipFeedback({ zip, address, profit }: { zip: string; address: string | null; profit: number }) {
  const [verdict, setVerdict] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [email, setEmail] = useState("");
  const [hp, setHp] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verdict) return;
    setState("saving");
    captureEvent("flip_feedback", { verdict, role: role ?? "none" });
    const res = await fetch("/api/flip/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verdict, role, comment, email, zip, address, profit, website: hp }),
    }).catch(() => null);
    setState(res?.ok ? "done" : "error");
  };

  if (state === "done") {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-[15px] font-medium text-emerald-800">
        <Check size={18} /> Tak. Vi læser alt, og flip-modellen bliver rettet efter det.
      </div>
    );
  }

  const chip = (active: boolean) =>
    clsx("rounded-full border px-3.5 py-2 text-[14px] transition-colors", active ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300");

  return (
    <form onSubmit={send} className="no-print rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
      <p className="text-[18px] font-semibold tracking-[-0.01em] text-slate-900">Ramte vi rigtigt?</p>
      <p className="mt-1 text-[14.5px] text-slate-600">Du kender boligerne bedre end vi gør. Sig til, hvad der er forkert, så retter vi modellen.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {VERDICTS.map((x) => (
          <button key={x.v} type="button" onClick={() => setVerdict(x.v)} className={chip(verdict === x.v)} aria-pressed={verdict === x.v}>
            {x.label}
          </button>
        ))}
      </div>
      {verdict && (
        <div className="mt-5 space-y-4">
          <div>
            <p className="text-[13px] font-medium text-slate-500">Hvem er du? (valgfrit)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {ROLES.map((x) => (
                <button key={x.v} type="button" onClick={() => setRole(role === x.v ? null : x.v)} className={chip(role === x.v)} aria-pressed={role === x.v}>
                  {x.label}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="text-[13px] font-medium text-slate-500">{verdict === "right" ? "Noget, du ville tilføje? (valgfrit)" : "Hvad er forkert, og hvad burde det være? (valgfrit)"}</span>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} rows={3} placeholder={verdict === "arv" ? "Fx: renoverede huse på vejen er solgt for ca. 1,1 mio." : verdict === "reno" ? "Fx: et nyt bad koster nærmere 120.000 kr. her" : ""} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-[15px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
          </label>
          <label className="block">
            <span className="text-[13px] font-medium text-slate-500">E-mail, hvis vi må spørge dig om mere (valgfrit)</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="mt-1.5 h-11 w-full max-w-sm rounded-xl border border-slate-200 px-3.5 text-[15px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
          </label>
          {/* Honeypot: hidden from people, filled by bots. */}
          <input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} className="hidden" aria-hidden />
          <div className="flex items-center gap-3">
            <button type="submit" disabled={state === "saving"} className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-[14.5px] font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
              {state === "saving" && <Loader2 size={15} className="animate-spin" />} Send
            </button>
            {state === "error" && <span className="text-[14px] text-rose-600">Det gik ikke igennem. Prøv igen.</span>}
          </div>
          <p className="text-[12.5px] text-slate-500">Vi bruger kun din e-mail til at spørge ind til din feedback.</p>
        </div>
      )}
    </form>
  );
}

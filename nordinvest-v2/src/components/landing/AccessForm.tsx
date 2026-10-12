"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { GOALS, PORTFOLIO, validate, type FieldErrors } from "@/lib/access/fields";
import { captureEvent } from "@/lib/analytics-events";

/*
 * "Anmod om adgang": what Nikolaj needs to call back, judge the fit and agree
 * a price. Short on purpose; the rest is taken in the conversation. Posts to
 * /api/adgang. Submitting never grants access.
 */

export function AccessForm({ source = "adgang" }: { source?: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [portfolio, setPortfolio] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const started = useRef(Date.now());
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (state === "sent") doneRef.current?.focus(); }, [state]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      name: f.get("name"), email: f.get("email"), phone: f.get("phone"), portfolio, goals,
      message: f.get("message"), website: f.get("website"),
      source, t: started.current,
    };
    // Check in the browser first, so the visitor gets instant, precise feedback.
    const local = validate(body);
    if (local.errors) {
      setErrors(local.errors);
      formRef.current?.querySelector<HTMLElement>(`[data-field="${Object.keys(local.errors)[0]}"]`)?.focus();
      return;
    }
    setState("sending");
    setErrors({});
    try {
      const res = await fetch("/api/adgang", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setState("sent");
        captureEvent("access_requested", { portfolio, goals: goals.join(","), source });
        return;
      }
      if (data.errors) {
        setErrors(data.errors);
        setState("idle");
        const first = Object.keys(data.errors)[0];
        formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus();
        return;
      }
      setState("error");
    } catch {
      setState("error");
    }
  };

  if (state === "sent") {
    return (
      <div ref={doneRef} tabIndex={-1} className="rounded-2xl bg-white p-6 text-slate-900 shadow-[0_30px_80px_-30px_rgba(11,27,51,0.5)] outline-none sm:p-8">
        <CheckCircle2 className="text-emerald-600" size={32} />
        <h2 className="mt-4 text-[24px] font-semibold tracking-[-0.02em]">Tak. Din anmodning er modtaget.</h2>
        <p className="mt-2 text-[16px] leading-relaxed text-slate-600">Jeg ringer dig op inden for en arbejdsdag. Du har også fået en bekræftelse på mail.</p>
        <p className="mt-4 text-[15px] text-slate-600">Haster det? Ring på <a href="tel:+4520993797" className="font-semibold text-blue-700">+45 20 99 37 97</a>.</p>
        <p className="mt-6 text-[15px] font-medium text-slate-900">Nikolaj Blond</p>
        <Link href="/" className="mt-6 inline-flex min-h-[44px] items-center rounded-lg border border-slate-300 px-4 text-[15px] font-semibold hover:border-slate-400">Tilbage til forsiden</Link>
      </div>
    );
  }

  const input = (bad?: string) => `h-12 w-full rounded-lg border bg-white px-3.5 text-[16px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${bad ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100" : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"}`;
  const chip = (on: boolean) => `min-h-[44px] rounded-lg border px-3.5 text-[15px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${on ? "border-[#0b1b33] bg-[#0b1b33] text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"}`;
  const Err = ({ k }: { k: keyof FieldErrors }) => (errors[k] ? <p id={`af-${k}-err`} className="mt-1.5 text-[13px] font-medium text-rose-600">{errors[k]}</p> : null);
  const label = "text-[14px] font-medium text-slate-700";

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="rounded-2xl bg-white p-5 text-slate-900 shadow-[0_30px_80px_-30px_rgba(11,27,51,0.5)] sm:p-8">
      <h2 className="text-[22px] font-semibold tracking-[-0.02em]">Anmod om adgang</h2>
      <p className="mt-1 text-[15px] text-slate-500">Tager 2 minutter. Jeg vender selv tilbage.</p>

      {/* Hidden from people; bots fill it in. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden"><label>Hjemmeside<input name="website" tabIndex={-1} autoComplete="off" /></label></div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="af-name" className={label}>Navn</label>
          <input id="af-name" name="name" data-field="name" autoComplete="name" aria-invalid={!!errors.name} aria-describedby={errors.name ? "af-name-err" : undefined} className={`mt-1.5 ${input(errors.name)}`} />
          <Err k="name" />
        </div>
        <div>
          <label htmlFor="af-mail" className={label}>E-mail</label>
          <input id="af-mail" name="email" type="email" data-field="email" autoComplete="email" inputMode="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? "af-email-err" : undefined} className={`mt-1.5 ${input(errors.email)}`} />
          <Err k="email" />
        </div>
        <div>
          <label htmlFor="af-tel" className={label}>Telefon</label>
          <input id="af-tel" name="phone" type="tel" data-field="phone" autoComplete="tel" inputMode="tel" placeholder="12 34 56 78" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "af-phone-err" : undefined} className={`mt-1.5 ${input(errors.phone)}`} />
          <Err k="phone" />
        </div>
      </div>

      <fieldset className="mt-5">
        <legend className={label}>Hvor mange udlejningsejendomme ejer du i dag?</legend>
        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-invalid={!!errors.portfolio}>
          {PORTFOLIO.map((p, i) => <button key={p} type="button" role="radio" aria-checked={portfolio === p} data-field={i === 0 ? "portfolio" : undefined} onClick={() => setPortfolio(p)} className={chip(portfolio === p)}>{p}</button>)}
        </div>
        <Err k="portfolio" />
      </fieldset>
      <fieldset className="mt-5">
        <legend className={label}>Hvad kigger du efter? <span className="font-normal text-slate-400">Vælg gerne flere</span></legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {GOALS.map((g) => { const on = goals.includes(g); return <button key={g} type="button" aria-pressed={on} onClick={() => setGoals(on ? goals.filter((x) => x !== g) : [...goals, g])} className={chip(on)}>{g}</button>; })}
        </div>
      </fieldset>

      <div className="mt-5">
        <label htmlFor="af-msg" className={label}>Hvad skal NordInvest hjælpe dig med? <span className="font-normal text-slate-400">(valgfrit)</span></label>
        <textarea id="af-msg" name="message" rows={3} className={`mt-1.5 ${input()} h-auto py-2.5`} />
      </div>

      {state === "error" && (
        <p role="alert" className="mt-5 rounded-lg bg-rose-50 px-4 py-3 text-[15px] text-rose-800">Anmodningen kunne ikke sendes lige nu. Prøv igen, eller ring på <a href="tel:+4520993797" className="font-semibold underline">+45 20 99 37 97</a>.</p>
      )}

      <button type="submit" disabled={state === "sending"} className="mt-6 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-[16px] font-semibold text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 active:translate-y-px disabled:opacity-70">
        {state === "sending" ? <><Loader2 size={18} className="animate-spin" /> Sender</> : "Send anmodning"}
      </button>
      <p className="mt-3 text-[13px] leading-relaxed text-slate-500">
        En anmodning giver ikke adgang i sig selv og forpligter dig ikke. Vi bruger kun oplysningerne til at kontakte dig. <Link href="/juridisk/privatlivspolitik" className="underline underline-offset-2 hover:text-slate-700">Privatlivspolitik</Link>
      </p>
    </form>
  );
}

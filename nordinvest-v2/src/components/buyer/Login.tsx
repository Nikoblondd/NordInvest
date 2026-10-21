"use client";

import { useState } from "react";
import { Loader2, Mail, X } from "lucide-react";
import { BoligkrydsMark } from "./Brand";

/*
 * Signing in to Boligkryds: an e-mail, then a link in the inbox. No password,
 * no form to fill in. A new address gets an account by itself.
 */
export function LoginBox({ reason, compact }: { reason?: string; compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) { setState("error"); return; }
    setState("sending");
    const r = await fetch("/api/boligkryds/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), next: location.pathname + location.search }) }).catch(() => null);
    setState(r?.ok ? "sent" : "error");
  };
  if (state === "sent") {
    return (
      <div className={compact ? "" : "px-6 py-10 text-center"}>
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><Mail size={26} /></span>
        <p className="mt-4 text-[20px] font-semibold">Tjek din mail</p>
        <p className="mx-auto mt-1.5 max-w-xs text-[15px] text-slate-600">Vi har sendt et link til <b>{email.trim()}</b>. Tryk på det, så er du logget ind.</p>
        <button type="button" onClick={() => setState("idle")} className="mt-4 text-[14px] font-medium text-slate-500 hover:underline">Forkert e-mail?</button>
      </div>
    );
  }
  return (
    <form onSubmit={send} className={compact ? "" : "px-6 py-10 text-center"} noValidate>
      {!compact && <div className="flex justify-center"><BoligkrydsMark size={44} /></div>}
      {!compact && <p className="mt-4 text-[21px] font-semibold leading-tight">Log ind, og fortsæt</p>}
      {reason && <p className={`mx-auto max-w-sm text-[15px] text-slate-600 ${compact ? "" : "mt-1.5"}`}>{reason}</p>}
      <label htmlFor="bk-mail" className="sr-only">Din e-mail</label>
      <input id="bk-mail" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setState("idle"); }} placeholder="din@mail.dk"
        className={`mt-5 h-[52px] w-full rounded-full border bg-white px-5 text-center text-[16px] focus:outline-none focus:ring-2 ${state === "error" ? "border-rose-400 focus:ring-rose-100" : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-100"}`} />
      {state === "error" && <p className="mt-2 text-[13px] font-medium text-rose-600">Skriv en gyldig e-mail.</p>}
      <button type="submit" disabled={state === "sending"} className="mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-emerald-600 text-[16px] font-semibold text-white hover:bg-emerald-500 disabled:opacity-70">
        {state === "sending" ? <Loader2 size={18} className="animate-spin" /> : null} Send mig et login-link
      </button>
      <p className="mt-3 text-[12px] text-slate-400">Gratis. Ingen adgangskode. Vi bruger kun din mail til login og de beskeder, du selv slår til.</p>
    </form>
  );
}

export function LoginSheet({ reason, onClose }: { reason: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal aria-label="Log ind" onClick={(e) => e.stopPropagation()} className="relative w-full max-w-[420px] rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <button type="button" onClick={onClose} aria-label="Luk" className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"><X size={19} /></button>
        <LoginBox reason={reason} />
      </div>
    </div>
  );
}

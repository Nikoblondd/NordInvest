"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/* First visit for an invited agent: name and a password, so they can log in again later. */
export function BrokerWelcome({ email, initialName }: { email: string; initialName: string }) {
  const [name, setName] = useState(initialName);
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setErr("Skriv dit navn.");
    if (pw.length < 8) return setErr("Adgangskoden skal være mindst 8 tegn.");
    setBusy(true); setErr(null);
    const supabase = createClient();
    const res = await supabase?.auth.updateUser({ password: pw, data: { full_name: name.trim(), broker_ready: true } });
    if (!res || res.error) { setBusy(false); setErr(res?.error && /weak|short|password/i.test(res.error.message) ? "Vælg en stærkere adgangskode." : "Kunne ikke gemme. Prøv igen."); return; }
    window.location.href = "/maegler";
  };
  const input = "mt-1.5 h-12 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-[16px] focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100";
  return (
    <div className="mx-auto max-w-[520px] px-4 py-10 sm:py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_32px_-20px_rgba(15,23,42,0.25)] sm:p-8">
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Velkommen til NordInvest</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600">Her laver I investoranalyser af jeres sager og sætter en knap på sagen på jeres hjemmeside. Vælg først en adgangskode. Du er logget ind som <b className="font-semibold text-slate-900">{email}</b>.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block"><span className="text-[14px] font-medium text-slate-700">Navn</span><input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={input} /></label>
          <label className="block"><span className="text-[14px] font-medium text-slate-700">Adgangskode</span>
            <span className="relative block">
              <input type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" className={`${input} pr-12`} />
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Skjul adgangskode" : "Vis adgangskode"} className="absolute right-1 top-[7px] flex h-10 w-10 items-center justify-center text-slate-500">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </span>
            <span className="mt-1 block text-[13px] text-slate-500">Mindst 8 tegn. Du bruger den, når du logger ind næste gang.</span>
          </label>
          {err && <p role="alert" className="text-[14px] font-medium text-rose-600">{err}</p>}
          <button type="submit" disabled={busy} className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-[16px] font-semibold text-white hover:bg-blue-500 disabled:opacity-60">{busy && <Loader2 size={17} className="animate-spin" />} Gem og fortsæt</button>
        </form>
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { normalisePhone } from "@/lib/access/fields";

/*
 * First login after the invitation: name, phone and a password, so the member
 * can sign in again later. Then into the app, where the guide starts.
 */
export function Welcome({ initialName, initialPhone, email, needsPassword }: { initialName: string; initialPhone: string; email: string; needsPassword: boolean }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = "Skriv dit navn.";
    const ph = normalisePhone(phone);
    if (!ph) errs.phone = "Skriv et telefonnummer med 8 cifre.";
    if (needsPassword && pw.length < 8) errs.pw = "Adgangskoden skal have mindst 8 tegn.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const supabase = createClient();
    if (!supabase) { setErrors({ form: "Login er ikke tilgængeligt lige nu." }); setBusy(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/auth/login?next=/app"); return; }
    const { error: authErr } = await supabase.auth.updateUser({ ...(needsPassword ? { password: pw } : {}), data: { full_name: name.trim(), onboarded: true } });
    if (authErr) {
      setBusy(false);
      setErrors({ form: /weak|short|password/i.test(authErr.message) ? "Vælg en stærkere adgangskode." : "Kunne ikke gemme. Prøv igen." });
      return;
    }
    await supabase.from("profiles").update({ full_name: name.trim(), phone: ph }).eq("id", user.id);
    router.replace("/app");
    router.refresh();
  };

  const input = (bad?: string) => `mt-1.5 h-12 w-full rounded-lg border bg-white px-3.5 text-[16px] focus:outline-none focus:ring-2 ${bad ? "border-rose-400 focus:ring-rose-100" : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"}`;
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4 py-10" style={{ background: "radial-gradient(900px 500px at 20% 0%, rgba(37,99,235,0.08), transparent 70%), #f8fafc" }}>
      <div className="w-full max-w-[460px]">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-slate-200/60"><Image src="/nordinvest-logo.png" alt="" width={40} height={40} className="h-[78%] w-[78%] object-contain" /></span>
          <span className="text-[18px] font-semibold">NordInvest</span>
        </div>
        <form onSubmit={submit} noValidate className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_30px_80px_-40px_rgba(11,27,51,0.4)] sm:p-8">
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">Velkommen indenfor</h1>
          <p className="mt-1.5 text-[15px] text-slate-600">Færdiggør din konto. Du er logget ind som <b className="font-semibold text-slate-800">{email}</b>.</p>
          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="w-name" className="text-[14px] font-medium text-slate-700">Navn</label>
              <input id="w-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={input(errors.name)} aria-invalid={!!errors.name} />
              {errors.name && <p className="mt-1.5 text-[13px] font-medium text-rose-600">{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="w-phone" className="text-[14px] font-medium text-slate-700">Telefon</label>
              <input id="w-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="12 34 56 78" className={input(errors.phone)} aria-invalid={!!errors.phone} />
              {errors.phone && <p className="mt-1.5 text-[13px] font-medium text-rose-600">{errors.phone}</p>}
            </div>
            {needsPassword && (
              <div>
                <label htmlFor="w-pw" className="text-[14px] font-medium text-slate-700">Vælg en adgangskode</label>
                <div className="relative">
                  <input id="w-pw" type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" className={`${input(errors.pw)} pr-12`} aria-invalid={!!errors.pw} aria-describedby="w-pw-help" />
                  <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Skjul adgangskode" : "Vis adgangskode"} className="absolute right-1 top-[7px] flex h-10 w-10 items-center justify-center text-slate-500">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
                <p id="w-pw-help" className={`mt-1.5 text-[13px] ${errors.pw ? "font-medium text-rose-600" : "text-slate-500"}`}>{errors.pw ?? "Mindst 8 tegn. Du bruger den, når du logger ind næste gang."}</p>
              </div>
            )}
          </div>
          {errors.form && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-[14px] text-rose-800">{errors.form}</p>}
          <button type="submit" disabled={busy} className="mt-6 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-[16px] font-semibold text-white hover:bg-blue-500 disabled:opacity-70">
            {busy ? <><Loader2 size={18} className="animate-spin" /> Gemmer</> : "Åbn NordInvest"}
          </button>
        </form>
      </div>
    </div>
  );
}

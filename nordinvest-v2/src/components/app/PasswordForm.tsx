"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Change password from the account page (also where a login link lands). */
export function PasswordForm({ focus }: { focus?: boolean }) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [err, setErr] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (focus) { ref.current?.scrollIntoView({ block: "center" }); ref.current?.focus(); } }, [focus]);
  return (
    <form className="flex flex-wrap items-start gap-2" onSubmit={async (e) => {
      e.preventDefault();
      if (pw.length < 8) { setErr("Mindst 8 tegn."); return; }
      setErr(""); setState("saving");
      const supabase = createClient();
      const { error } = (await supabase?.auth.updateUser({ password: pw })) ?? { error: new Error("x") };
      if (error) { setState("error"); setErr(/weak|short/i.test(error.message) ? "Vælg en stærkere adgangskode." : "Kunne ikke gemme. Prøv igen."); return; }
      setState("saved"); setPw("");
    }}>
      <div className="min-w-[220px] flex-1">
        <label htmlFor="new-pw" className="sr-only">Ny adgangskode</label>
        <div className="relative">
          <input ref={ref} id="new-pw" type={show ? "text" : "password"} autoComplete="new-password" value={pw} onChange={(e) => { setPw(e.target.value); setState("idle"); }} placeholder="Ny adgangskode"
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 pr-11 text-[16px] focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" />
          <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Skjul" : "Vis"} className="absolute right-0.5 top-0.5 flex h-10 w-10 items-center justify-center text-slate-500">{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
        </div>
        {err && <p className="mt-1 text-[13px] font-medium text-rose-600">{err}</p>}
        {state === "saved" && <p className="mt-1 flex items-center gap-1 text-[13px] font-medium text-emerald-700"><Check size={14} /> Adgangskoden er skiftet.</p>}
      </div>
      <button type="submit" disabled={state === "saving"} className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 text-[15px] font-semibold hover:border-slate-400 disabled:opacity-60">{state === "saving" && <Loader2 size={15} className="animate-spin" />} Skift adgangskode</button>
    </form>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { BoligkrydsLogo } from "./Brand";

export function LoginLanding({ code, failed }: { code: string; failed: boolean }) {
  const form = useRef<HTMLFormElement>(null);
  // A person clicking the link is signed in straight away; the button is there if scripts are off.
  useEffect(() => { if (!failed) form.current?.submit(); }, [failed]);
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f4f6f9] px-4">
      <div className="w-full max-w-[400px] rounded-3xl bg-white p-8 text-center shadow-[0_30px_60px_-30px_rgba(15,23,42,0.3)] ring-1 ring-slate-200">
        <div className="flex justify-center"><BoligkrydsLogo /></div>
        {failed ? (
          <>
            <h1 className="mt-6 text-[22px] font-semibold">Linket virker ikke længere</h1>
            <p className="mt-2 text-[15px] text-slate-600">Det er brugt, eller mere end 24 timer gammelt. Få et nyt på kortet.</p>
            <a href="/" className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-emerald-600 text-[16px] font-semibold text-white">Til Boligkryds</a>
          </>
        ) : (
          <>
            <p className="mt-6 flex items-center justify-center gap-2 text-[16px] text-slate-700"><Loader2 size={18} className="animate-spin text-emerald-600" /> Logger dig ind …</p>
            <form ref={form} action="/api/boligkryds/verify" method="post" className="mt-6">
              <input type="hidden" name="code" value={code} />
              <button type="submit" className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-emerald-600 text-[16px] font-semibold text-white">Log ind</button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

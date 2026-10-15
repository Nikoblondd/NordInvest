"use client";

import { useState } from "react";

export function AfmeldButton({ e, t }: { e: string; t: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  if (state === "done") return <p className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-[15px] font-medium text-emerald-800">Du er afmeldt.</p>;
  return (
    <>
      <button type="button" disabled={state === "busy" || !e || !t} onClick={async () => {
        setState("busy");
        const r = await fetch(`/api/afmeld?e=${encodeURIComponent(e)}&t=${encodeURIComponent(t)}`, { method: "POST" }).catch(() => null);
        setState(r?.ok ? "done" : "error");
      }} className="mt-6 inline-flex min-h-[46px] items-center justify-center rounded-lg bg-slate-900 px-5 text-[15px] font-semibold text-white hover:bg-slate-800 disabled:opacity-50">Afmeld</button>
      {state === "error" && <p className="mt-3 text-[14px] text-rose-600">Afmeldingen mislykkedes. Skriv til contact@nordinvest.io, så fjerner vi dig.</p>}
    </>
  );
}

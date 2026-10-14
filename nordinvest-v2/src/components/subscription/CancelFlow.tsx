"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { captureEvent } from "@/lib/analytics-events";
import { loadSupabase } from "@/lib/supabase/lazy";
import { site } from "@/lib/site";
import { clsx } from "@/lib/clsx";

type Reason = "price" | "done" | "numbers" | "usage" | "other";

const REASONS: { id: Reason; label: string }[] = [
  { id: "price", label: "Det er for dyrt" },
  { id: "done", label: "Jeg har købt, eller er stoppet med at lede" },
  { id: "usage", label: "Jeg bruger det ikke nok" },
  { id: "numbers", label: "Tallene passede ikke" },
  { id: "other", label: "Noget andet" },
];

/**
 * Before a subscriber reaches Stripe's cancel screen: one question about why,
 * and an answer to that reason (a cheaper plan, what they keep for free, or a
 * direct line to the founder). The reason is stored on their account so it
 * can be read later; cancelling stays one more click away, never hidden.
 */
export function CancelFlow({ tier }: { tier: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<null | "portal" | "downgrade">(null);
  const [msg, setMsg] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    captureEvent("cancel_flow_opened", { tier });
    dialogRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, tier]);

  const remember = async (outcome: string) => {
    captureEvent("cancel_flow_result", { tier, reason, outcome });
    const s = await loadSupabase();
    await s?.auth.updateUser({ data: { cancel_reason: reason, cancel_note: note.slice(0, 500), cancel_reason_at: new Date().toISOString(), cancel_outcome: outcome } });
  };

  const toPortal = async () => {
    setBusy("portal");
    await remember("continued_to_cancel");
    const res = await fetch("/api/stripe/portal", { method: "POST" }).then((r) => r.json()).catch(() => null);
    if (res?.url) window.location.href = res.url;
    else { setBusy(null); setMsg("Kunne ikke åbne Stripe lige nu. Skriv til " + site.email + ", så opsiger jeg for dig."); }
  };

  const downgrade = async () => {
    setBusy("downgrade");
    await remember("downgraded_to_starter");
    const res = await fetch("/api/stripe/change-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tier: "starter" }) })
      .then((r) => r.json()).catch(() => null);
    if (res?.url) { window.location.href = res.url; return; }
    setBusy(null);
    setMsg(res?.ok ? "Du er skiftet til Starter. Forskellen bliver trukket fra din næste betaling." : "Kunne ikke skifte plan lige nu. Prøv igen om lidt.");
  };

  const offer = (() => {
    if (reason === "price" && tier === "pro")
      return { text: "Starter koster 129 kr./md. og har 10 analyser om måneden, bankrapport og Excel. Det er nok for de fleste, der leder efter én bolig.", action: { label: "Skift til Starter i stedet", run: downgrade } };
    if (reason === "price" || reason === "usage")
      return { text: "Opsiger du, beholder du din gratis konto: 3 analyser om måneden, Deal-motorens top 10, dine gemte boliger og prisvagter. Du kan altid opgradere igen, når du er på jagt." };
    if (reason === "done")
      return { text: "Tillykke, hvis du har købt. Dine gemte boliger og prisvagter bliver på din gratis konto, så du har tallene, næste gang du leder." };
    if (reason === "numbers")
      return { text: "Skriv, hvilken bolig og hvilket tal der ikke passede, så retter vi det.", action: { label: "Skriv til os", run: () => { remember("wrote_founder"); window.location.href = "/kontakt?emne=fejl"; } } };
    return null;
  })();

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-medium text-slate-400 underline underline-offset-2 hover:text-slate-600">
        Opsig abonnement
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
          <button type="button" aria-label="Luk" tabIndex={-1} onClick={() => setOpen(false)} className="absolute inset-0 bg-slate-950/50" />
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="cancel-h" className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-3xl sm:p-8">
            <button type="button" onClick={() => setOpen(false)} aria-label="Luk" className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100">
              <X aria-hidden size={20} />
            </button>
            <h2 id="cancel-h" className="pr-8 text-xl font-semibold text-slate-900">Før du opsiger: hvorfor?</h2>
            <p className="mt-1 text-sm text-slate-500">Ét klik. Det hjælper mig med at gøre NordInvest bedre.</p>
            <fieldset className="mt-4 space-y-2">
              <legend className="sr-only">Grund til opsigelse</legend>
              {REASONS.map((r) => (
                <label key={r.id} className={clsx("flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-[15px]", reason === r.id ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300")}>
                  <input type="radio" name="reason" checked={reason === r.id} onChange={() => setReason(r.id)} className="h-4 w-4 accent-blue-600" />
                  {r.label}
                </label>
              ))}
            </fieldset>
            {reason && (
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Vil du sige lidt mere? (valgfrit)…"
                className="mt-3 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-[15px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            )}
            {offer && (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-[15px] leading-relaxed text-slate-700">
                {offer.text}
                {offer.action && (
                  <button type="button" onClick={offer.action.run} disabled={!!busy} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                    {busy === "downgrade" && <Loader2 aria-hidden size={16} className="animate-spin" />}
                    {offer.action.label}
                  </button>
                )}
              </div>
            )}
            {msg && <p role="status" className="mt-3 text-sm text-slate-700">{msg}</p>}
            <button
              type="button"
              onClick={toPortal}
              disabled={!reason || !!busy}
              className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {busy === "portal" && <Loader2 aria-hidden size={16} className="animate-spin" />}
              Fortsæt til opsigelse
            </button>
            <p className="mt-2 text-center text-xs text-slate-400">Du opsiger hos Stripe og beholder adgangen perioden ud.</p>
          </div>
        </div>
      )}
    </>
  );
}

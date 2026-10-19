"use client";

import { useState } from "react";
import { Check, Loader2, Mail } from "lucide-react";
import { captureEvent } from "@/lib/analytics-events";
import { cityOptInText } from "@/lib/deal-subscribe-text";

/**
 * "Månedens bedste køb i <by>" on a kommune page: no account needed. The box
 * is unticked and must be ticked (consent), and the address is only added once
 * its owner confirms from the email (double opt-in).
 */
export function CityDealsOptIn({ slug, name, cityIn }: { slug: string; name: string; cityIn: string }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [hp, setHp] = useState("");
  const [state, setState] = useState<{ s: "idle" | "sending" | "sent" | "error"; msg?: string }>({ s: "idle" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) return setState({ s: "error", msg: "Sæt flueben for at give samtykke." });
    setState({ s: "sending" });
    const res = await fetch("/api/deals/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, kommune: slug, consent, website: hp }),
    }).catch(() => null);
    const d = await res?.json().catch(() => null);
    if (res?.ok && d?.ok) {
      setState({ s: "sent" });
      captureEvent("city_optin_requested", { kommune: slug });
    } else setState({ s: "error", msg: d?.error ?? "Noget gik galt. Prøv igen om lidt." });
  };

  return (
    <section aria-labelledby={`optin-${slug}`} className="mt-10 overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 shadow-[0_10px_30px_-20px_rgba(37, 52, 90,0.45)] sm:p-7">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-center">
        <div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Mail aria-hidden size={19} strokeWidth={2} />
          </span>
          <h2 id={`optin-${slug}`} className="mt-4 text-xl font-semibold tracking-[-0.02em] text-slate-900 [text-wrap:balance] sm:text-2xl">
            Få månedens bedste køb {cityIn} på mail
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
            De 3 boliger i {name}, der regner bedst som udlejning, den 1. i hver måned. Gratis, uden konto.
          </p>
        </div>

        {state.s === "sent" ? (
          <p role="status" className="flex items-start gap-3 rounded-xl bg-white p-4 text-[15px] text-slate-700 ring-1 ring-inset ring-emerald-200">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check aria-hidden size={14} strokeWidth={3} />
            </span>
            <span>
              <strong className="text-slate-900">Tjek din mail.</strong> Vi har sendt et link til {email}. Tryk på det for at bekræfte, så er du med.
            </span>
          </p>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor={`optin-email-${slug}`} className="sr-only">Din mail</label>
              <input
                id={`optin-email-${slug}`}
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                spellCheck={false}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="din@mail.dk"
                className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 text-[16px] text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <button
                type="submit"
                disabled={state.s === "sending"}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-[15px] font-semibold text-white transition-[background-color,transform] hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-70"
              >
                {state.s === "sending" ? <Loader2 aria-hidden size={17} className="animate-spin" /> : null}
                Tilmeld
              </button>
            </div>
            {/* honeypot */}
            <input type="text" name="website" value={hp} onChange={(e) => setHp(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
            <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug text-slate-600">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                {cityOptInText(cityIn)} Se{" "}
                <a href="/juridisk/privatlivspolitik" className="underline underline-offset-2 hover:text-slate-900">privatlivspolitikken</a>.
              </span>
            </label>
            <div aria-live="polite">
              {state.s === "error" && <p className="text-[14px] font-medium text-rose-600">{state.msg}</p>}
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

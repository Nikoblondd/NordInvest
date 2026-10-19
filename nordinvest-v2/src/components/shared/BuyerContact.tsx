"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2, Send } from "lucide-react";

/*
 * "Skriv til mægleren" on a shared analysis. The buyer's message goes to the
 * agent who owns the link (or via NordInvest for the hand-made links), and the
 * agent sees it in /maegler. Hidden honeypot field and the time the form was
 * shown keep simple bots out.
 */
export function BuyerContact({ slug, street, viaNordInvest }: { slug: string; street: string; viaNordInvest: boolean }) {
  const [shownAt, setShownAt] = useState(0);
  useEffect(() => setShownAt(Date.now()), []);
  const [f, setF] = useState({ name: "", email: "", phone: "", message: `Hej, jeg har set analysen af ${street} og vil gerne høre mere om ejendommen.`, consent: false, website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error" | "duplicate">("idle");
  const set = (k: keyof typeof f, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("busy"); setErrors({});
    const res = await fetch("/api/e/lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, slug, t: shownAt }) })
      .then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }))
      .catch(() => ({ status: 0, body: {} as Record<string, unknown> }));
    if (res.status === 200 && res.body.ok) return setState("sent");
    if (res.status === 422 && res.body.errors) { setErrors(res.body.errors as Record<string, string>); return setState("idle"); }
    setState(res.status === 409 ? "duplicate" : "error");
  };

  const input = "mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[16px] focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100";
  const err = (k: string) => errors[k] ? <p className="mt-1 text-[13px] font-medium text-rose-600">{errors[k]}</p> : null;

  if (state === "sent") {
    return (
      <div className="border-t-2 border-emerald-700 pt-6">
        <p className="flex items-center gap-2 text-[18px] font-semibold text-emerald-900"><Check size={20} /> Din besked er sendt</p>
        <p className="mt-1.5 text-[15px] text-emerald-900/80">{viaNordInvest ? "Vi sender den videre til mægleren på sagen, som svarer dig på mail." : "Mægleren på sagen har fået den og svarer dig på mail."} Du har også fået en kopi.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="relative border-t-2 border-[var(--color-ink)] pt-6" noValidate>
      <h2 className="text-[22px] font-semibold tracking-[-0.01em]">Skriv til mægleren om {street}</h2>
      <p className="mt-1.5 max-w-[60ch] text-[15px] text-slate-600">{viaNordInvest ? "Vi sender din besked videre til mægleren, der har sagen." : "Beskeden går direkte til mægleren, der har sagen."} Du får svar på mail.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="bc-name" className="text-[14px] font-medium text-slate-700">Navn</label><input id="bc-name" autoComplete="name" value={f.name} onChange={(e) => set("name", e.target.value)} className={input} aria-invalid={!!errors.name} />{err("name")}</div>
        <div><label htmlFor="bc-email" className="text-[14px] font-medium text-slate-700">E-mail</label><input id="bc-email" type="email" autoComplete="email" value={f.email} onChange={(e) => set("email", e.target.value)} className={input} aria-invalid={!!errors.email} />{err("email")}</div>
        <div className="sm:col-span-2"><label htmlFor="bc-phone" className="text-[14px] font-medium text-slate-700">Telefon <span className="font-normal text-slate-500">(valgfri)</span></label><input id="bc-phone" type="tel" autoComplete="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} className={input} aria-invalid={!!errors.phone} />{err("phone")}</div>
        <div className="sm:col-span-2"><label htmlFor="bc-msg" className="text-[14px] font-medium text-slate-700">Besked</label><textarea id="bc-msg" rows={4} maxLength={1500} value={f.message} onChange={(e) => set("message", e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[16px] leading-relaxed focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" aria-invalid={!!errors.message} />{err("message")}</div>
      </div>
      <div className="absolute -left-[9999px]" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set("website", e.target.value)} /></label></div>
      <label className="mt-4 flex items-start gap-2.5 text-[14px] text-slate-600">
        <input type="checkbox" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-blue-600" />
        <span>Jeg accepterer, at mine oplysninger sendes til mægleren på sagen, så de kan svare mig. Læs <Link href="/juridisk/privatlivspolitik" className="font-medium text-blue-700 underline">privatlivspolitikken</Link>.</span>
      </label>
      {err("consent")}
      {state === "error" && <p role="alert" className="mt-3 text-[14px] font-medium text-rose-600">Beskeden blev ikke sendt. Prøv igen om lidt, eller skriv til contact@nordinvest.io.</p>}
      {state === "duplicate" && <p role="alert" className="mt-3 text-[14px] font-medium text-amber-700">Du har allerede sendt en besked om sagen for lidt siden. Mægleren vender tilbage.</p>}
      <button type="submit" disabled={state === "busy"} className="mt-5 inline-flex min-h-[48px] items-center gap-2 rounded-lg bg-blue-600 px-5 text-[16px] font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
        {state === "busy" ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />} Send til mægleren
      </button>
    </form>
  );
}

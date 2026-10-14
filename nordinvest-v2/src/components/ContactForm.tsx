"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Send } from "lucide-react";
import { TOPICS, type ContactErrors, type TopicId } from "@/lib/contact";
import { clsx } from "@/lib/clsx";

/*
 * The contact form: pick a topic, write the message, send. It lands in
 * contact@nordinvest.io with the sender as reply-to. Members get their name
 * and e-mail filled in.
 */
export function ContactForm({ name: initialName = "", email: initialEmail = "", topic: initialTopic, page }: { name?: string; email?: string; topic?: TopicId; page?: string }) {
  const [topic, setTopic] = useState<TopicId | "">(initialTopic ?? "");
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<ContactErrors>({});
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const started = useRef(0);
  useEffect(() => { started.current = Date.now(); }, []);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const local: ContactErrors = {};
    if (!topic) local.topic = "Vælg et emne.";
    if (name.trim().length < 2) local.name = "Skriv dit navn.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) local.email = "Skriv en gyldig e-mailadresse.";
    if (message.trim().length < 10) local.message = "Skriv en besked på mindst 10 tegn.";
    setErrors(local);
    if (Object.keys(local).length) return;
    setState("sending");
    const website = (new FormData(e.currentTarget).get("website") as string) || "";
    const res = await fetch("/api/kontakt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, name, email, message, page: page ?? (typeof document !== "undefined" ? document.referrer : ""), website, t: started.current }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data?.ok) { setState("sent"); return; }
    if (data?.errors) setErrors(data.errors);
    setState("error");
  };

  if (state === "sent") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <p className="flex items-center gap-2 text-[17px] font-semibold text-emerald-900"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white"><Check size={16} strokeWidth={3} /></span> Beskeden er sendt</p>
        <p className="mt-2 text-[15px] text-emerald-900/80">Vi svarer typisk inden for en arbejdsdag på {email}. Du har fået en kvittering på mail.</p>
        <button type="button" onClick={() => { setMessage(""); setState("idle"); }} className="mt-4 text-[14px] font-semibold text-emerald-800 underline underline-offset-2">Skriv en ny besked</button>
      </div>
    );
  }

  const field = "mt-1.5 w-full rounded-lg border bg-white px-3.5 text-[16px] text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
  const err = (k: keyof ContactErrors) => errors[k] && <p id={`c-${k}-err`} className="mt-1.5 text-[13px] font-medium text-rose-600">{errors[k]}</p>;

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <fieldset>
        <legend className="text-[14px] font-medium text-slate-700">Emne</legend>
        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-describedby={errors.topic ? "c-topic-err" : undefined}>
          {TOPICS.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={topic === t.id} onClick={() => setTopic(t.id)}
              className={clsx("min-h-[42px] rounded-full px-4 text-[14px] font-semibold ring-1 ring-inset transition-colors", topic === t.id ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-700 ring-slate-300 hover:ring-slate-400")}>
              {t.label}
            </button>
          ))}
        </div>
        {err("topic")}
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-[14px] font-medium text-slate-700">Navn</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={!!errors.name} aria-describedby={errors.name ? "c-name-err" : undefined} className={clsx(field, "h-12", errors.name ? "border-rose-400" : "border-slate-300")} />
          {err("name")}
        </label>
        <label className="block">
          <span className="text-[14px] font-medium text-slate-700">E-mail</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? "c-email-err" : undefined} className={clsx(field, "h-12", errors.email ? "border-rose-400" : "border-slate-300")} />
          {err("email")}
        </label>
      </div>
      <label className="block">
        <span className="text-[14px] font-medium text-slate-700">Besked</span>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={7} maxLength={5000}
          placeholder={topic === "fejl" ? "Hvad skete der, og på hvilken side eller ejendom?" : topic === "forslag" ? "Hvad mangler du, og hvordan ville du bruge det?" : "Skriv din besked her."}
          aria-invalid={!!errors.message} aria-describedby={errors.message ? "c-message-err" : undefined} className={clsx(field, "py-3 leading-relaxed", errors.message ? "border-rose-400" : "border-slate-300")} />
        {err("message")}
      </label>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      {state === "error" && <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-[14px] text-rose-800">Beskeden kunne ikke sendes. Prøv igen, eller skriv til contact@nordinvest.io.</p>}
      <button type="submit" disabled={state === "sending"} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 text-[16px] font-semibold text-white hover:bg-blue-500 disabled:opacity-60 max-sm:w-full">
        {state === "sending" ? <Loader2 size={17} className="animate-spin" /> : <Send size={16} />} {state === "sending" ? "Sender…" : "Send besked"}
      </button>
    </form>
  );
}

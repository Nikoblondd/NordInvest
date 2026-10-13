"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { NumberInput } from "@/components/ui/NumberInput";
import { OFFER_STATUS, type Mappe, type Offer } from "@/lib/mappe/checklist";
import { withLog, ymd } from "@/lib/app/calendar";
import { Dialog, btn, input, label } from "./ui";

/*
 * Register a bid or update it: the amount, the date, where it stands
 * (afgivet, modbud, accepteret, afslået), the seller's counter-offer and the
 * answer deadline. Every bid is kept in the case's bid history; a deadline is
 * put in the calendar so it cannot be missed.
 */

const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
export const OFFER_TONE: Record<Offer["status"], string> = {
  afgivet: "bg-blue-50 text-blue-800 ring-blue-200", modbud: "bg-amber-50 text-amber-900 ring-amber-200",
  accepteret: "bg-emerald-50 text-emerald-800 ring-emerald-200", afslaaet: "bg-slate-100 text-slate-600 ring-slate-200",
};

/** All bids on a property, newest first (older cases only have `offer`). */
export const offersOf = (m: Mappe): Offer[] => (m.offers?.length ? m.offers : m.offer ? [{ ...m.offer, id: m.offer.id ?? "o0" }] : []);

/** Applies a new or changed bid to the case: history, current bid, stage, deadline in the calendar and the log. */
export function applyOffer(m: Mappe, o: Offer, existed: boolean): Mappe {
  const list = offersOf(m);
  const offers = existed ? list.map((x) => (x.id === o.id ? o : x)) : [o, ...list];
  const sorted = [...offers].sort((a, b) => b.date.localeCompare(a.date));
  let next: Mappe = { ...m, offers: sorted, offer: sorted[0] ?? null };
  if (!existed && ["screening", "fremvisning", "dokumenter", "bank"].includes(m.stage)) next.stage = "bud";
  // The answer deadline as an appointment, kept in step with the bid.
  const taskId = `bud-${o.id}`;
  const tasks = (next.tasks ?? []).filter((t) => t.id !== taskId);
  if (o.deadline && (o.status === "afgivet" || o.status === "modbud")) {
    tasks.push({ id: taskId, kind: "bud", title: o.status === "modbud" ? "Svar på modbud" : "Svarfrist på dit bud", due: o.deadline, done: false });
  }
  next = { ...next, tasks };
  const text = existed
    ? `Bud på ${kr(o.amount)}: ${OFFER_STATUS[o.status].toLowerCase()}${o.status === "modbud" && o.counter ? `, modbud ${kr(o.counter)}` : ""}`
    : `Bud afgivet: ${kr(o.amount)}`;
  return withLog(next, text, "bud");
}

export function OfferDialog({ open, onClose, offer, price, maxBid, onSave }: {
  open: boolean; onClose: () => void; offer: Offer | null; price: number; maxBid?: number | null;
  onSave: (o: Offer, existed: boolean) => Promise<boolean> | boolean;
}) {
  const [amount, setAmount] = useState<number | null>(null);
  const [date, setDate] = useState(ymd(new Date()));
  const [status, setStatus] = useState<Offer["status"]>("afgivet");
  const [counter, setCounter] = useState<number | null>(null);
  const [deadline, setDeadline] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount(offer?.amount ?? (price ? Math.round((price * 0.95) / 5000) * 5000 : null));
    setDate(offer?.date?.slice(0, 10) ?? ymd(new Date()));
    setStatus(offer?.status ?? "afgivet");
    setCounter(offer?.counter ?? null);
    setDeadline(offer?.deadline ?? "");
    setNote(offer?.note ?? "");
    setErr(null);
    setBusy(false);
  }, [open, offer, price]);

  const submit = async () => {
    if (!amount || amount < 10000) return setErr("Skriv beløbet på dit bud.");
    if (status === "modbud" && !counter) return setErr("Skriv sælgers modbud, eller vælg en anden status.");
    setBusy(true); setErr(null);
    const o: Offer = { id: offer?.id ?? `o${Date.now()}`, amount, date, status, counter: status === "modbud" ? counter : null, deadline: deadline || null, note: note.trim() || undefined };
    const ok = await onSave(o, !!offer);
    setBusy(false);
    if (ok) onClose(); else setErr("Buddet kunne ikke gemmes. Prøv igen.");
  };

  const pct = amount && price ? Math.round(((amount - price) / price) * 1000) / 10 : null;
  return (
    <Dialog open={open} onClose={onClose} title={offer ? "Opdatér bud" : "Registrér bud"} sub={price ? `Udbudspris ${kr(price)}${maxBid ? ` · dit maks ${kr(maxBid)}` : ""}` : undefined}
      footer={<><button type="button" className={btn.secondary} onClick={onClose}>Annullér</button><button type="button" className={btn.primary} disabled={busy} onClick={submit}>{busy && <Loader2 size={15} className="animate-spin" />}{offer ? "Gem" : "Registrér bud"}</button></>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="of-amount" className={label}>Dit bud</label>
            <div className="mt-1.5 flex h-11 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
              <NumberInput id="of-amount" value={amount} onValueChange={setAmount} className="w-full min-w-0 bg-transparent text-[15px] font-semibold tabular-nums outline-none" />
              <span className="text-[13px] text-slate-500">kr.</span>
            </div>
            {pct != null && <p className={clsx("mt-1 text-[13px]", pct < 0 ? "text-emerald-700" : "text-amber-700")}>{pct === 0 ? "Lig med udbudsprisen" : `${pct > 0 ? "+" : ""}${pct.toLocaleString("da-DK")} % i forhold til udbudsprisen`}{maxBid && amount && amount > maxBid ? ", over dit maks" : ""}</p>}
          </div>
          <div>
            <label htmlFor="of-date" className={label}>Afgivet den</label>
            <input id="of-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={clsx(input, "mt-1.5")} />
          </div>
        </div>
        <fieldset>
          <legend className={label}>Status</legend>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(Object.keys(OFFER_STATUS) as Offer["status"][]).map((s) => (
              <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)}
                className={clsx("min-h-[38px] rounded-full px-3.5 text-[13px] font-semibold ring-1 transition-colors", status === s ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-700 ring-slate-200 hover:ring-slate-300")}>{OFFER_STATUS[s]}</button>
            ))}
          </div>
        </fieldset>
        {status === "modbud" && (
          <div>
            <label htmlFor="of-counter" className={label}>Sælgers modbud</label>
            <div className="mt-1.5 flex h-11 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
              <NumberInput id="of-counter" value={counter} onValueChange={setCounter} className="w-full min-w-0 bg-transparent text-[15px] font-semibold tabular-nums outline-none" />
              <span className="text-[13px] text-slate-500">kr.</span>
            </div>
          </div>
        )}
        {(status === "afgivet" || status === "modbud") && (
          <div>
            <label htmlFor="of-deadline" className={label}>Svarfrist <span className="font-normal text-slate-400">(lægges i kalenderen)</span></label>
            <input id="of-deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={clsx(input, "mt-1.5")} />
          </div>
        )}
        <div>
          <label htmlFor="of-note" className={label}>Note <span className="font-normal text-slate-400">(forbehold, aftaler)</span></label>
          <textarea id="of-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Fx med advokat- og finansieringsforbehold" className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 text-[15px] placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" />
        </div>
        {err && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-[14px] font-medium text-rose-700">{err}</p>}
      </div>
    </Dialog>
  );
}

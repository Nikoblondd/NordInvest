"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, Loader2, Trash2 } from "lucide-react";
import { clsx } from "@/lib/clsx";
import type { TaskKind } from "@/lib/mappe/checklist";
import { KIND, KIND_ORDER, downloadIcs, street, ymd, type CalItem } from "@/lib/app/calendar";
import { Dialog, btn, input, label } from "./ui";
import type { Draft } from "./useCalendar";

/*
 * Create or edit one appointment: what kind, which property (or none), when,
 * where and a note. Used by the calendar, the overview and the property case.
 */

export type DialogState = { item?: CalItem; day?: string; time?: string; rowId?: string | null; kind?: TaskKind } | null;

const TITLES: Record<TaskKind, string> = { fremvisning: "Fremvisning", bank: "Møde i banken", maegler: "Ring til mægleren", bud: "Svarfrist på bud", raadgiver: "Møde med købers rådgiver", andet: "" };
const HOURS = Array.from({ length: 34 }, (_, i) => `${String(6 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

export function EventDialog({ state, onClose, homes, onSave, onDelete }: {
  state: DialogState;
  onClose: () => void;
  homes: { id: string; address: string }[];
  onSave: (d: Draft) => Promise<boolean>;
  onDelete?: (i: CalItem) => Promise<boolean>;
}) {
  const it = state?.item;
  const [kind, setKind] = useState<TaskKind>("fremvisning");
  const [title, setTitle] = useState("");
  const [touched, setTouched] = useState(false);
  const [rowId, setRowId] = useState<string>("");
  const [day, setDay] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [from, setFrom] = useState("10:00");
  const [to, setTo] = useState("11:00");
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!state) return;
    const k = it?.kind ?? state.kind ?? "fremvisning";
    setKind(k);
    setTitle(it?.title ?? TITLES[k]);
    setTouched(!!it);
    setRowId(it ? it.rowId ?? "" : state.rowId ?? "");
    setDay(it?.due?.slice(0, 10) ?? state.day ?? ymd(new Date()));
    const t = it?.due && it.due.length > 10 ? it.due.slice(11, 16) : state.time ?? null;
    setAllDay(!!it && !t);
    setFrom(t ?? "10:00");
    const plus = (s: string) => `${String(Math.min(23, Number(s.slice(0, 2)) + 1)).padStart(2, "0")}:${s.slice(3)}`;
    setTo(it?.end ?? plus(t ?? "10:00"));
    setPlace(it?.place ?? "");
    setNote(it?.note ?? "");
    setErr(null);
    setBusy(null);
  }, [state, it]);

  const pickKind = (k: TaskKind) => {
    setKind(k);
    if (!touched || Object.values(TITLES).includes(title)) setTitle(TITLES[k]);
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim()) return setErr("Skriv hvad aftalen handler om.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return setErr("Vælg en dato.");
    if (!allDay && to <= from) return setErr("Sluttidspunktet skal ligge efter starten.");
    setBusy("save"); setErr(null);
    const ok = await onSave({ key: it?.key, id: it?.id ?? "", rowId: rowId || null, kind, title: title.trim(), due: allDay ? day : `${day}T${from}`, end: allDay ? null : to, place: place.trim(), note: note.trim(), done: it?.done ?? false });
    setBusy(null);
    if (ok) onClose(); else setErr("Aftalen kunne ikke gemmes. Prøv igen.");
  };

  return (
    <Dialog error={err} open={!!state} onClose={onClose} title={it ? "Ret aftale" : "Ny aftale"}
      footer={<>
        {it && onDelete && <button type="button" className={clsx(btn.danger, "mr-auto")} disabled={!!busy} onClick={async () => { setBusy("delete"); const ok = await onDelete(it); setBusy(null); if (ok) onClose(); }}>{busy === "delete" ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Slet</button>}
        {it?.due && <button type="button" className={btn.ghost} onClick={() => downloadIcs(it)}><CalendarPlus size={15} /> Til din kalender</button>}
        <button type="button" className={btn.secondary} onClick={onClose}>Annullér</button>
        <button type="button" className={btn.primary} disabled={!!busy} onClick={() => submit()}>{busy === "save" && <Loader2 size={15} className="animate-spin" />}{it ? "Gem" : "Opret aftale"}</button>
      </>}>
      <form onSubmit={submit} className="space-y-4">
        <fieldset>
          <legend className={label}>Type</legend>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {KIND_ORDER.map((k) => (
              <button key={k} type="button" onClick={() => pickKind(k)} aria-pressed={kind === k}
                className={clsx("inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ring-1 transition-colors", kind === k ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-700 ring-slate-200 hover:ring-slate-300")}>
                <span className={clsx("h-2 w-2 rounded-full", KIND[k].dot)} />{KIND[k].label}
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="ev-title" className={label}>Hvad</label>
          <input id="ev-title" value={title} onChange={(e) => { setTitle(e.target.value); setTouched(true); }} placeholder="Fx Fremvisning med mægleren" className={clsx(input, "mt-1.5")} maxLength={140} />
        </div>
        <div>
          <label htmlFor="ev-home" className={label}>Bolig</label>
          <select id="ev-home" value={rowId} onChange={(e) => setRowId(e.target.value)} className={clsx(input, "mt-1.5")}>
            <option value="">Ingen bestemt bolig</option>
            {homes.map((h) => <option key={h.id} value={h.id}>{street(h.address)}</option>)}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <label htmlFor="ev-day" className={label}>Dato</label>
            <input id="ev-day" type="date" value={day} onChange={(e) => setDay(e.target.value)} className={clsx(input, "mt-1.5")} />
          </div>
          {!allDay && (
            <>
              <div>
                <label htmlFor="ev-from" className={label}>Fra</label>
                <select id="ev-from" value={from} onChange={(e) => { const v = e.target.value; setFrom(v); if (to <= v) setTo(HOURS[Math.min(HOURS.length - 1, HOURS.indexOf(v) + 2)]); }} className={clsx(input, "mt-1.5 tabular-nums")}>
                  {HOURS.map((h) => <option key={h} value={h}>{h.replace(":", ".")}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="ev-to" className={label}>Til</label>
                <select id="ev-to" value={to} onChange={(e) => setTo(e.target.value)} className={clsx(input, "mt-1.5 tabular-nums")}>
                  {HOURS.filter((h) => h > from).map((h) => <option key={h} value={h}>{h.replace(":", ".")}</option>)}
                </select>
              </div>
            </>
          )}
        </div>
        <label className="flex min-h-[40px] cursor-pointer items-center gap-2.5 text-[14px] text-slate-700">
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="h-[18px] w-[18px] rounded border-slate-300 accent-blue-600" />
          Hele dagen, uden klokkeslæt (fx en frist)
        </label>
        <div>
          <label htmlFor="ev-place" className={label}>Sted <span className="font-normal text-slate-400">(valgfrit)</span></label>
          <input id="ev-place" value={place} onChange={(e) => setPlace(e.target.value)} placeholder={rowId ? "Boligens adresse" : "Fx Danske Bank, Aarhus C"} className={clsx(input, "mt-1.5")} maxLength={140} />
        </div>
        <div>
          <label htmlFor="ev-note" className={label}>Note <span className="font-normal text-slate-400">(valgfrit)</span></label>
          <textarea id="ev-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Fx spørg til fællesudgifter og vedligeholdelsesplan" className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-3 text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" />
        </div>
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { BellPlus, Check, Pencil, Plus, Trash2, UserPlus, X } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { NumberInput } from "@/components/ui/NumberInput";
import type { Task } from "@/lib/mappe/checklist";
import {
  EXPENSE_LABELS, actualCashFlow, activeLeases, balance, estimatedValue, expectedRent, lastMonths, monthKey, monthLabel, months, nextRegulation, payment,
  type Drift as DriftData, type Entry, type Lease,
} from "@/lib/drift";
import { btn } from "./ui";

/*
 * The Drift tab on a bought property: the tenants, this month's rent and
 * costs, the actual cash flow next to what the analysis expected, the loan's
 * remaining debt and an estimate of the equity. Rent regulations become
 * reminders in the calendar (and the morning mail) like any other appointment.
 */

const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${Math.round(Math.abs(n)).toLocaleString("da-DK")}`;
const dateDk = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" });
const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const field = "mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[16px] focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100";
const label = "text-[13px] font-medium text-slate-600";

export function Drift({ drift: d, expected, onChange, onTask }: {
  drift: DriftData;
  /** The analysis' monthly cash flow, to compare with. */
  expected: number | null;
  onChange: (d: DriftData, log?: string) => void;
  onTask: (t: Task, log: string) => void;
}) {
  const [leaseEdit, setLeaseEdit] = useState<Lease | null>(null);
  const [cost, setCost] = useState<{ label: string; amount: number | null; month: string } | null>(null);
  const [loanEdit, setLoanEdit] = useState(false);
  const now = monthKey();
  const rows = months(d, lastMonths(12));
  const actual = actualCashFlow(d);
  const rent = expectedRent(d);
  const debt = d.loan ? balance(d.loan) : null;
  const value = estimatedValue(d);
  const thisMonth = rows[rows.length - 1];
  const rentDone = activeLeases(d).length > 0 && activeLeases(d).every((l) => d.entries.some((e) => e.month === now && e.kind === "leje" && e.id.endsWith(`-${l.id}`)));
  const max = Math.max(1, ...rows.filter((r) => r.registered).map((r) => Math.max(r.income, r.costs + r.loan)));

  const registerRent = () => {
    const add: Entry[] = activeLeases(d)
      .filter((l) => !d.entries.some((e) => e.month === now && e.id.endsWith(`-${l.id}`)))
      .map((l) => ({ id: `r${now}-${l.id}`, month: now, kind: "leje", label: `Husleje, ${l.tenant}`, amount: l.rent }));
    if (add.length) onChange({ ...d, entries: [...d.entries, ...add] }, `Husleje for ${monthLabel(now)} registreret`);
  };
  const saveCost = () => {
    if (!cost || !(cost.amount && cost.amount > 0)) return;
    onChange({ ...d, entries: [...d.entries, { id: uid("u"), month: cost.month, kind: "udgift", label: cost.label, amount: cost.amount }] }, `Udgift registreret: ${cost.label}, ${kr(cost.amount)}`);
    setCost(null);
  };
  const removeEntry = (id: string) => onChange({ ...d, entries: d.entries.filter((e) => e.id !== id) });
  const remind = (l: Lease) => {
    const next = nextRegulation(l);
    if (!next) return;
    const due = new Date(`${next}T09:00:00`);
    due.setMonth(due.getMonth() - 3);
    const day = due < new Date() ? new Date() : due;
    const ymd = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    onTask({ id: uid("t"), kind: "andet", title: `Lejeregulering: ${l.tenant}`, due: `${ymd}T09:00`, done: false, note: `Lejen kan tidligst reguleres ${dateDk(next)}, hvis kontrakten giver mulighed for det. Tjek kontraktens bestemmelse og varslingsreglerne i lejeloven, før du sender varslet.` }, `Påmindelse om lejeregulering for ${l.tenant} sat i kalenderen`);
  };
  const saveLease = (l: Lease) => {
    const exists = d.leases.some((x) => x.id === l.id);
    onChange({ ...d, leases: exists ? d.leases.map((x) => (x.id === l.id ? l : x)) : [...d.leases, l] }, exists ? `Lejer opdateret: ${l.tenant}` : `Lejer tilføjet: ${l.tenant}`);
    if (!exists && l.indexed) remind(l);
    setLeaseEdit(null);
  };

  return (
    <div className="space-y-5">
      {/* Figures */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Fig k="Husleje pr. md." v={kr(rent)} sub={`${activeLeases(d).length} ${activeLeases(d).length === 1 ? "lejemål" : "lejemål"} udlejet`} />
        <Fig k="Faktisk cash flow" v={actual ? `${signed(actual.avg)} kr./md.` : "–"} tone={actual ? (actual.avg >= 0 ? "text-emerald-700" : "text-rose-600") : undefined}
          sub={actual ? `Gns. af ${actual.months} ${actual.months === 1 ? "måned" : "måneder"}${expected != null ? `. Analysen: ${signed(expected)}` : ""}` : "Registrér husleje og udgifter"} />
        <Fig k="Restgæld" v={debt != null ? kr(debt) : "–"} sub={d.loan ? `Ydelse ${kr(payment(d.loan))}/md.` : "Tilføj lånet"} />
        <Fig k="Friværdi (skøn)" v={value != null && debt != null ? kr(value - debt) : "–"} sub="Købspris + 3 % om året minus restgæld" />
      </div>

      {actual && expected != null && (
        <p className={clsx("rounded-xl px-4 py-3 text-[15px]", actual.avg >= expected ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900")}>
          {actual.avg >= expected
            ? `Ejendommen giver ${kr(actual.avg - expected)} mere om måneden, end analysen regnede med.`
            : `Ejendommen giver ${kr(expected - actual.avg)} mindre om måneden, end analysen regnede med. Se, hvilke udgifter der fylder mest nedenfor.`}
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {/* This month */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[16px] font-semibold">{monthLabel(now).replace(/^./, (c) => c.toUpperCase())}</h2>
            <p className={clsx("text-[15px] font-semibold tabular-nums", thisMonth.net >= 0 ? "text-emerald-700" : "text-rose-600")}>{thisMonth.registered ? `${signed(thisMonth.net)} kr.` : ""}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={registerRent} disabled={rentDone} className={rentDone ? btn.secondary : btn.primary}>
              {rentDone ? <><Check size={15} /> Husleje registreret</> : <><Plus size={15} /> Registrér husleje ({kr(rent)})</>}
            </button>
            <button type="button" onClick={() => setCost({ label: EXPENSE_LABELS[0], amount: null, month: now })} className={btn.secondary}><Plus size={15} /> Udgift</button>
          </div>
          {activeLeases(d).length === 0 && <p className="mt-2 text-[14px] text-slate-500">Tilføj dine lejere til højre, så kan huslejen registreres med ét tryk hver måned.</p>}
          {cost && (
            <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
              <label className="block"><span className={label}>Udgift</span>
                <select value={cost.label} onChange={(e) => setCost({ ...cost, label: e.target.value })} className={field}>{EXPENSE_LABELS.map((x) => <option key={x}>{x}</option>)}</select>
              </label>
              <label className="block"><span className={label}>Beløb (kr.)</span><NumberInput value={cost.amount} onValueChange={(n) => setCost({ ...cost, amount: n })} className={field} inputMode="numeric" autoFocus /></label>
              <label className="block"><span className={label}>Måned</span>
                <select value={cost.month} onChange={(e) => setCost({ ...cost, month: e.target.value })} className={field}>{lastMonths(12).reverse().map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select>
              </label>
              <div className="flex gap-2"><button type="button" onClick={saveCost} disabled={!(cost.amount && cost.amount > 0)} className={btn.primary}>Gem</button><button type="button" onClick={() => setCost(null)} className={btn.ghost} aria-label="Fortryd"><X size={16} /></button></div>
            </div>
          )}
          {/* Twelve months */}
          <p className="mt-6 text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">De seneste 12 måneder</p>
          <div className="mt-2 flex h-28 items-end gap-1" aria-hidden>
            {rows.map((r) => (
              <div key={r.month} className="flex h-full flex-1 flex-col justify-end gap-0.5" title={r.registered ? `${monthLabel(r.month)}: ${signed(r.net)} kr.` : `${monthLabel(r.month)}: ikke registreret`}>
                {r.registered ? (
                  <>
                    <div className="rounded-t bg-emerald-500/80" style={{ height: `${(r.income / max) * 100}%` }} />
                    <div className="rounded-b bg-rose-400/70" style={{ height: `${((r.costs + r.loan) / max) * 100}%` }} />
                  </>
                ) : <div className="h-1 rounded bg-slate-200" />}
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[12px] text-slate-500"><span>{monthLabel(rows[0].month)}</span><span className="flex gap-3"><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-emerald-500" />Indtægt</span><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-rose-400" />Udgifter og lån</span></span><span>{monthLabel(rows[rows.length - 1].month)}</span></div>
          <table className="mt-4 w-full text-[14px]">
            <caption className="sr-only">Indtægter, udgifter og resultat pr. måned</caption>
            <thead><tr className="text-left text-[12px] text-slate-500"><th className="py-1 font-medium">Måned</th><th className="py-1 text-right font-medium">Indtægt</th><th className="py-1 text-right font-medium">Udgifter</th><th className="hidden py-1 text-right font-medium sm:table-cell">Lån</th><th className="py-1 text-right font-medium">Resultat</th></tr></thead>
            <tbody className="tabular-nums">
              {rows.filter((r) => r.registered).reverse().map((r) => (
                <tr key={r.month} className="border-t border-slate-100"><td className="py-1.5">{monthLabel(r.month)}</td><td className="py-1.5 text-right">{kr(r.income)}</td><td className="py-1.5 text-right">{kr(r.costs)}</td><td className="hidden py-1.5 text-right sm:table-cell">{kr(r.loan)}</td><td className={clsx("py-1.5 text-right font-semibold", r.net >= 0 ? "text-emerald-700" : "text-rose-600")}>{signed(r.net)}</td></tr>
              ))}
            </tbody>
          </table>
          {!rows.some((r) => r.registered) && <p className="mt-2 text-[14px] text-slate-500">Ingen måneder registreret endnu.</p>}
          {d.entries.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-[14px] font-medium text-slate-600">Alle posteringer ({d.entries.length})</summary>
              <ul className="mt-2 divide-y divide-slate-100 text-[14px]">
                {[...d.entries].sort((a, b) => b.month.localeCompare(a.month)).map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-1.5">
                    <span className="w-20 shrink-0 text-slate-500">{monthLabel(e.month)}</span><span className="min-w-0 flex-1 truncate">{e.label}</span>
                    <span className={clsx("tabular-nums", e.kind === "leje" ? "text-emerald-700" : "text-slate-800")}>{e.kind === "leje" ? "+" : "−"}{Math.round(e.amount).toLocaleString("da-DK")}</span>
                    <button type="button" onClick={() => removeEntry(e.id)} aria-label={`Slet ${e.label}`} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600"><Trash2 size={14} /></button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <div className="space-y-5">
          {/* Tenants */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3"><h2 className="text-[16px] font-semibold">Lejere</h2>
              <button type="button" onClick={() => setLeaseEdit({ id: uid("l"), tenant: "", rent: 0, start: new Date().toISOString().slice(0, 10), indexed: true })} className="inline-flex items-center gap-1 text-[14px] font-semibold text-blue-700 hover:underline"><UserPlus size={15} /> Tilføj lejer</button>
            </div>
            {d.leases.length === 0 && !leaseEdit && <p className="mt-2 text-[14px] text-slate-500">Ingen lejere endnu.</p>}
            <ul className="mt-3 space-y-2">
              {d.leases.map((l) => {
                const next = nextRegulation(l);
                return (
                  <li key={l.id} className={clsx("rounded-xl border border-slate-200 p-3", l.end && "opacity-60")}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0"><p className="font-semibold text-slate-900">{l.tenant}{l.unit ? <span className="font-normal text-slate-500">, {l.unit}</span> : null}</p>
                        <p className="text-[14px] text-slate-600">{kr(l.rent)}/md. · siden {dateDk(l.start)}{l.end ? ` · fraflyttet ${dateDk(l.end)}` : ""}</p>
                        {next && !l.end && <p className="mt-0.5 text-[13px] text-slate-500">Næste mulige regulering: {dateDk(next)}</p>}
                      </div>
                      <button type="button" onClick={() => setLeaseEdit(l)} aria-label={`Redigér ${l.tenant}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Pencil size={15} /></button>
                    </div>
                    {next && !l.end && <button type="button" onClick={() => remind(l)} className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue-700 hover:underline"><BellPlus size={14} /> Påmindelse 3 måneder før</button>}
                  </li>
                );
              })}
            </ul>
            {leaseEdit && <LeaseForm lease={leaseEdit} onSave={saveLease} onCancel={() => setLeaseEdit(null)} onRemove={d.leases.some((x) => x.id === leaseEdit.id) ? () => { onChange({ ...d, leases: d.leases.filter((x) => x.id !== leaseEdit.id) }, `Lejer fjernet: ${leaseEdit.tenant}`); setLeaseEdit(null); } : undefined} />}
          </section>

          {/* Purchase and loan */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3"><h2 className="text-[16px] font-semibold">Køb og lån</h2>
              <button type="button" onClick={() => setLoanEdit((v) => !v)} className="inline-flex items-center gap-1 text-[14px] font-semibold text-blue-700 hover:underline"><Pencil size={14} /> {loanEdit ? "Luk" : "Ret"}</button>
            </div>
            {!loanEdit ? (
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[14px]">
                <dt className="text-slate-500">Købt</dt><dd className="text-right">{d.boughtAt ? dateDk(d.boughtAt) : "–"}</dd>
                <dt className="text-slate-500">Købspris</dt><dd className="text-right tabular-nums">{d.boughtPrice ? kr(d.boughtPrice) : "–"}</dd>
                <dt className="text-slate-500">Lån</dt><dd className="text-right tabular-nums">{d.loan ? kr(d.loan.principal) : "–"}</dd>
                <dt className="text-slate-500">Rente og løbetid</dt><dd className="text-right tabular-nums">{d.loan ? `${d.loan.ratePct.toLocaleString("da-DK")} %, ${d.loan.years} år` : "–"}</dd>
              </dl>
            ) : (
              <LoanForm d={d} onSave={(next) => { onChange(next, "Køb og lån opdateret"); setLoanEdit(false); }} />
            )}
            <p className="mt-3 text-[13px] text-slate-500">Restgælden er beregnet som et fast forrentet annuitetslån. Har du flere lån eller afdragsfrihed, så brug bankens tal. Mere om drift i <Link href="/blog/driftsbudget-udlejningsbolig" className="underline">guiden om driftsbudget</Link>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}

function LeaseForm({ lease, onSave, onCancel, onRemove }: { lease: Lease; onSave: (l: Lease) => void; onCancel: () => void; onRemove?: () => void }) {
  const [l, setL] = useState(lease);
  const ok = l.tenant.trim().length > 0 && l.rent > 0 && /^\d{4}-\d{2}-\d{2}$/.test(l.start);
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (ok) onSave({ ...l, tenant: l.tenant.trim() }); }} className="mt-3 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
      <label className="block"><span className={label}>Lejer</span><input value={l.tenant} onChange={(e) => setL({ ...l, tenant: e.target.value })} className={field} autoFocus /></label>
      <label className="block"><span className={label}>Lejemål (valgfrit)</span><input value={l.unit ?? ""} onChange={(e) => setL({ ...l, unit: e.target.value })} placeholder="fx 1. th." className={field} /></label>
      <label className="block"><span className={label}>Husleje pr. md. (kr.)</span><NumberInput value={l.rent || null} onValueChange={(n) => setL({ ...l, rent: n ?? 0 })} className={field} inputMode="numeric" /></label>
      <label className="block"><span className={label}>Depositum (kr.)</span><NumberInput value={l.deposit ?? null} onValueChange={(n) => setL({ ...l, deposit: n ?? undefined })} className={field} inputMode="numeric" /></label>
      <label className="block"><span className={label}>Indflytning</span><input type="date" value={l.start} onChange={(e) => setL({ ...l, start: e.target.value })} className={field} /></label>
      <label className="block"><span className={label}>Fraflytning (valgfrit)</span><input type="date" value={l.end ?? ""} onChange={(e) => setL({ ...l, end: e.target.value || null })} className={field} /></label>
      <label className="flex items-start gap-2 text-[14px] text-slate-700 sm:col-span-2"><input type="checkbox" checked={!!l.indexed} onChange={(e) => setL({ ...l, indexed: e.target.checked })} className="mt-1 h-4 w-4 accent-blue-600" /> Kontrakten giver mulighed for årlig regulering efter nettoprisindeks (vi sætter en påmindelse i kalenderen)</label>
      {l.indexed && <label className="block"><span className={label}>Senest reguleret (valgfrit)</span><input type="date" value={l.regulatedAt ?? ""} onChange={(e) => setL({ ...l, regulatedAt: e.target.value || null })} className={field} /></label>}
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button type="submit" disabled={!ok} className={btn.primary}>Gem lejer</button>
        <button type="button" onClick={onCancel} className={btn.ghost}>Fortryd</button>
        {onRemove && <button type="button" onClick={onRemove} className={clsx(btn.danger, "ml-auto")}><Trash2 size={15} /> Fjern</button>}
      </div>
    </form>
  );
}

function LoanForm({ d, onSave }: { d: DriftData; onSave: (d: DriftData) => void }) {
  const [boughtAt, setBoughtAt] = useState(d.boughtAt ?? "");
  const [price, setPrice] = useState<number | null>(d.boughtPrice ?? null);
  const [principal, setPrincipal] = useState<number | null>(d.loan?.principal ?? null);
  const [rate, setRate] = useState<number | null>(d.loan?.ratePct ?? 5);
  const [years, setYears] = useState<number | null>(d.loan?.years ?? 30);
  const [start, setStart] = useState(d.loan?.start ?? monthKey());
  const save = () => onSave({
    ...d, boughtAt: boughtAt || null, boughtPrice: price || null,
    loan: principal && principal > 0 ? { principal, ratePct: rate ?? 0, years: years && years > 0 ? years : 30, start } : null,
  });
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="block"><span className={label}>Købsdato</span><input type="date" value={boughtAt} onChange={(e) => setBoughtAt(e.target.value)} className={field} /></label>
      <label className="block"><span className={label}>Købspris (kr.)</span><NumberInput value={price} onValueChange={setPrice} className={field} inputMode="numeric" /></label>
      <label className="block"><span className={label}>Lånebeløb (kr.)</span><NumberInput value={principal} onValueChange={setPrincipal} className={field} inputMode="numeric" /></label>
      <label className="block"><span className={label}>Rente (%)</span><NumberInput value={rate} onValueChange={setRate} decimals={2} className={field} inputMode="decimal" /></label>
      <label className="block"><span className={label}>Løbetid (år)</span><NumberInput value={years} onValueChange={setYears} group={false} className={field} inputMode="numeric" /></label>
      <label className="block"><span className={label}>Første ydelse</span><input type="month" value={start} onChange={(e) => setStart(e.target.value)} className={field} /></label>
      <div className="sm:col-span-2"><button type="button" onClick={save} className={btn.primary}>Gem</button></div>
    </div>
  );
}

function Fig({ k, v, sub, tone }: { k: string; v: string; sub: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[13px] font-medium text-slate-500">{k}</p>
      <p className={clsx("mt-1 text-[20px] font-semibold tabular-nums tracking-[-0.02em] text-slate-900", tone)}>{v}</p>
      <p className="mt-0.5 text-[12px] leading-snug text-slate-500">{sub}</p>
    </div>
  );
}

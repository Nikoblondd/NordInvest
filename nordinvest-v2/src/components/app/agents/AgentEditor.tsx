"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Building2, Hammer, Home, Loader2, Sparkles, Users } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { CityPicker } from "@/components/deals/DealFinder";
import { NumberInput } from "@/components/ui/NumberInput";
import { EMPTY_CRITERIA, STRATEGIES, SUBCATS, TYPES, WEEKDAYS, nextRun, searchParams, suggestName, whenLabel, type Agent, type Criteria, type Freq, type Schedule, type Strategy } from "@/lib/app/agents";
import { Dialog, Segmented, Toggle, btn, input, label } from "../ui";
import { PropertyImage } from "../PropertyImage";

/*
 * Create or change a search agent: what to look for (the Deal-motor's own
 * filters), when to look (every day, on weekdays or once a week, at an hour)
 * and whether to send an e-mail. While the member types, the form shows how
 * many listings match right now, so the criteria are never a guess.
 */

export type AgentInput = { name: string; criteria: Criteria; schedule: Schedule; email: boolean; strategy?: Strategy; brief?: string };
const HOURS = Array.from({ length: 18 }, (_, i) => 5 + i);

export function AgentEditor({ open, onClose, initial, onSave, title }: {
  open: boolean; onClose: () => void; initial?: Partial<AgentInput> | Agent | null; onSave: (a: AgentInput) => Promise<string | null>; title: string;
}) {
  const [c, setC] = useState<Criteria>(EMPTY_CRITERIA);
  const [strategy, setStrategy] = useState<Strategy>("udlejning");
  const [brief, setBrief] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<string | null>(null);
  const [s, setS] = useState<Schedule>({ freq: "daily", hour: 7, weekday: 1 });
  const [email, setEmail] = useState(true);
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ status: "idle" | "loading" | "done" | "error"; count: number; top: { id: string; image: string | null; road: string; price: number }[] }>({ status: "idle", count: 0, top: [] });

  useEffect(() => {
    if (!open) return;
    setC({ ...EMPTY_CRITERIA, ...(initial?.criteria ?? {}) });
    setS({ freq: "daily", hour: 7, weekday: 1, ...(initial?.schedule ?? {}) });
    setEmail(initial?.email ?? true);
    const init = initial as (Partial<AgentInput> & { strategy?: Strategy; brief?: string }) | null | undefined;
    setStrategy(init?.strategy ?? (init?.criteria?.market === "investering" ? "erhverv" : "udlejning"));
    setBrief(init?.brief ?? "");
    setParsed(null);
    setName(initial?.name ?? "");
    setNameTouched(!!initial?.name);
    setErr(null);
    setBusy(false);
  }, [open, initial]);

  const set = (patch: Partial<Criteria>) => setC((p) => ({ ...p, ...patch }));
  const autoName = suggestName(c);

  // Live count of what matches today.
  const seq = useRef(0);
  useEffect(() => {
    if (!open) return;
    const n = ++seq.current;
    setPreview((p) => ({ ...p, status: "loading" }));
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/deals/search?${searchParams(c).toString()}`);
        const d = await r.json();
        if (n !== seq.current) return;
        const deals = (Array.isArray(d?.deals) ? d.deals : []).filter((x: { suspect?: boolean }) => !x.suspect);
        setPreview({ status: d?.ok ? "done" : "error", count: deals.length, top: deals.slice(0, 4).map((x: { id: string; image: string | null; road?: string; title?: string; price: number }) => ({ id: String(x.id), image: x.image, road: x.road || x.title || "", price: x.price })) });
      } catch {
        if (n === seq.current) setPreview({ status: "error", count: 0, top: [] });
      }
    }, 650);
    return () => clearTimeout(t);
  }, [c, open]);

  const submit = async () => {
    if (c.priceMin && c.priceMax && c.priceMin > c.priceMax) return setErr("Mindsteprisen er højere end maksprisen.");
    setBusy(true); setErr(null);
    const e = await onSave({ name: (nameTouched && name.trim()) || autoName, criteria: c, schedule: s, email, strategy, brief: brief.trim() || undefined });
    setBusy(false);
    if (e) setErr(e); else onClose();
  };

  const numField = (id: string, text: string, value: number | null, onChange: (v: number | null) => void, suffix?: string, decimals?: number) => (
    <div>
      <label htmlFor={id} className={label}>{text}</label>
      <div className="mt-1.5 flex h-11 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
        <NumberInput id={id} value={value ?? undefined} decimals={decimals} onValueChange={(v) => onChange(v ?? null)} placeholder="Ingen grænse" className="w-full min-w-0 bg-transparent text-[15px] tabular-nums text-slate-900 outline-none placeholder:text-slate-400" />
        {suffix && <span className="shrink-0 text-[13px] text-slate-500">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <Dialog error={err} open={open} onClose={onClose} title={title} sub="Agenten gennemsøger hele markedet på dine tidspunkter og giver besked, når der kommer nye boliger." wide
      footer={<>
        <span className="mr-auto text-[13px] text-slate-500" aria-live="polite">
          {preview.status === "loading" ? <span className="inline-flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Tæller…</span>
            : preview.status === "done" ? <><b className="font-semibold text-slate-900">{preview.count === 100 ? "100+" : preview.count}</b> {preview.count === 1 ? "bolig matcher" : "boliger matcher"} lige nu</>
            : preview.status === "error" ? "Kunne ikke tælle lige nu" : ""}
        </span>
        <button type="button" className={btn.secondary} onClick={onClose}>Annullér</button>
        <button type="button" className={btn.primary} disabled={busy} onClick={submit}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Bell size={15} />} {initial && "id" in (initial as object) ? "Gem ændringer" : "Start agenten"}</button>
      </>}>
      <div className="space-y-6">
        {/* What */}
        <section>
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-slate-500">Hvad leder du efter</h3>
          <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
            <label htmlFor="ag-brief" className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800"><Sparkles size={14} className="text-blue-600" /> Beskriv med dine egne ord</label>
            <textarea id="ag-brief" value={brief} onChange={(e) => setBrief(e.target.value)} rows={2} maxLength={600}
              placeholder="Fx en 3-værelses i Aarhus C til forældrekøb under 2,5 mio., eller billige ældre huse på Fyn, jeg kan renovere"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-[15px] placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="button" disabled={parsing || brief.trim().length < 4} onClick={async () => {
                setParsing(true); setParsed(null);
                const r = await fetch("/api/app/agents/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: brief }) }).then((x) => x.json()).catch(() => null);
                setParsing(false);
                if (!r?.ok) return setParsed("Kunne ikke læse beskrivelsen. Udfyld felterne nedenfor.");
                setC(r.criteria); setStrategy(r.strategy); if (!nameTouched) { setName(r.name); setNameTouched(true); }
                setParsed(r.summary || "Kriterierne er udfyldt. Ret dem nedenfor, hvis noget skal være anderledes.");
              }} className={btn.secondary}>{parsing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Udfyld kriterierne</button>
              {parsed && <span className="text-[13px] text-slate-600">{parsed}</span>}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {STRATEGIES.map((st) => {
              const Icon = st.id === "udlejning" ? Home : st.id === "familie" ? Users : st.id === "flip" ? Hammer : Building2;
              const on = strategy === st.id;
              return (
                <button key={st.id} type="button" aria-pressed={on} onClick={() => {
                  setStrategy(st.id);
                  if (st.id === "erhverv" && c.market !== "investering") set({ market: "investering", priceMax: 20000000, subcat: null });
                  if (st.id !== "erhverv" && c.market !== "bolig") set({ market: "bolig", priceMax: 3000000, subcat: null });
                }} className={clsx("flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-colors", on ? "border-blue-600 bg-blue-50/50 ring-1 ring-blue-600" : "border-slate-200 hover:border-slate-300")}>
                  <span className={clsx("flex h-8 w-8 items-center justify-center rounded-lg", on ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500")}><Icon size={16} /></span>
                  <span><span className="block text-[14px] font-semibold text-slate-900">{st.label}</span><span className="block text-[12px] leading-snug text-slate-500">{st.lead}</span></span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <span className={label}>Område</span>
              <CityPicker values={c.municipalities} onChange={(municipalities) => set({ municipalities })} />
            </div>
            {c.market === "bolig" ? (
              <div className="sm:col-span-2">
                <span className={label}>Boligtype</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {TYPES.map((t) => (
                    <button key={t.id} type="button" onClick={() => set({ type: t.id })} aria-pressed={c.type === t.id}
                      className={clsx("min-h-[38px] rounded-full px-3.5 text-[13px] font-semibold ring-1 transition-colors", c.type === t.id ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-700 ring-slate-200 hover:ring-slate-300")}>{t.label}</button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="sm:col-span-2">
                <label htmlFor="ag-sub" className={label}>Ejendomstype</label>
                <select id="ag-sub" value={c.subcat ?? ""} onChange={(e) => set({ subcat: e.target.value || null })} className={clsx(input, "mt-1.5")}>
                  <option value="">Alle typer</option>
                  {SUBCATS.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
            )}
            {numField("ag-pmin", "Pris fra", c.priceMin, (v) => set({ priceMin: v }), "kr.")}
            {numField("ag-pmax", "Pris op til", c.priceMax, (v) => set({ priceMax: v }), "kr.")}
            {numField("ag-area", "Mindst areal", c.areaMin, (v) => set({ areaMin: v }), "m²")}
            {c.market === "bolig" && numField("ag-rooms", "Mindst værelser", c.roomsMin, (v) => set({ roomsMin: v }))}
          </div>
        </section>

        {/* Numbers */}
        <section>
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-slate-500">Krav til tallene</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {numField("ag-score", "Mindst score", c.minScore, (v) => set({ minScore: v }), "af 100")}
            {numField("ag-yield", "Mindst afkast", c.minYield, (v) => set({ minYield: v }), "%", 1)}
            {numField("ag-cf", "Mindst cash flow", c.minCashflow, (v) => set({ minCashflow: v }), "kr./md.")}
          </div>
          <p className="mt-2 text-[13px] text-slate-500">Tallene regnes med 20 % udbetaling og 5 % rente for boliger (30 % for erhverv), ligesom i Deal-motoren.</p>
        </section>

        {/* When */}
        <section>
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-slate-500">Tidspunkt for søgning</h3>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <Segmented label="Hvor ofte" value={s.freq} onChange={(freq: Freq) => setS((p) => ({ ...p, freq }))} options={[{ id: "daily", label: "Hver dag" }, { id: "weekdays", label: "Hverdage" }, { id: "weekly", label: "Ugentligt" }]} />
            {s.freq === "weekly" && (
              <div>
                <label htmlFor="ag-wd" className="sr-only">Ugedag</label>
                <select id="ag-wd" value={s.weekday} onChange={(e) => setS((p) => ({ ...p, weekday: Number(e.target.value) }))} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-[14px] capitalize">
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => <option key={d} value={d} className="capitalize">{WEEKDAYS[d]}</option>)}
                </select>
              </div>
            )}
            <div>
              <label htmlFor="ag-hour" className="sr-only">Klokkeslæt</label>
              <select id="ag-hour" value={s.hour} onChange={(e) => setS((p) => ({ ...p, hour: Number(e.target.value) }))} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-[14px] tabular-nums">
                {HOURS.map((h) => <option key={h} value={h}>kl. {String(h).padStart(2, "0")}.00</option>)}
              </select>
            </div>
          </div>
          <p className="mt-2 text-[13px] text-slate-500">Næste gang: {whenLabel(nextRun(s))}.</p>
        </section>

        {/* Notify + name */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-3.5">
            <span><span className="block text-[14px] font-semibold text-slate-900">Mail ved nye fund</span><span className="block text-[13px] text-slate-500">Der sendes kun mail, når der er nye boliger.</span></span>
            <Toggle on={email} onChange={setEmail} label="Mail mig om nye boliger" />
          </div>
          <div>
            <label htmlFor="ag-name" className={label}>Navn på agenten</label>
            <input id="ag-name" value={nameTouched ? name : autoName} onChange={(e) => { setName(e.target.value); setNameTouched(true); }} maxLength={80} className={clsx(input, "mt-1.5")} />
          </div>
        </section>

        {preview.status === "done" && preview.top.length > 0 && (
          <section>
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-slate-500">Matcher lige nu</h3>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {preview.top.map((t) => (
                <div key={t.id} className="overflow-hidden rounded-lg border border-slate-200">
                  <div className="h-16 w-full overflow-hidden bg-slate-50"><PropertyImage src={t.image} /></div>
                  <p className="truncate px-2 pt-1.5 text-[12px] font-semibold text-slate-800">{t.road}</p>
                  <p className="px-2 pb-1.5 text-[12px] tabular-nums text-slate-500">{Math.round(t.price).toLocaleString("da-DK")} kr.</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[13px] text-slate-500">Dem, der matcher nu, ser du med det samme. Fremover giver agenten kun besked om nye.</p>
          </section>
        )}
      </div>
    </Dialog>
  );
}

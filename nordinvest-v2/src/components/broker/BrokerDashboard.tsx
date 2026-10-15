"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Check, Code2, Copy, Eye, Link2, Loader2, MonitorSmartphone, PenLine, Plus, Search, Trash2, X } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { CORNERS, DEFAULT_BADGE, SIZES, TEXTS, THEMES, badgeHtml, badgeSize, type BadgeOptions } from "@/lib/broker/badge";

/*
 * The agent's dashboard: find a listing (or type the numbers in), get the
 * investor analysis link, and put a NordInvest button on the listing page.
 * The preview is the real badge image and the real snippet, so what the agent
 * sees here is exactly what goes on their site.
 */

export type DashLink = { slug: string; url: string; price: number; rent: number; subcat: string | null; addr: string; imgs?: string[]; createdAt?: string; legacy?: boolean; views?: number };
type Case = { id: string; url: string; addr: string; price: number; yieldPct: number; subcat: string | null; image: string | null; agency: string | null };

const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const pct = (n: number) => `${n.toLocaleString("da-DK", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} %`;
const yieldOf = (l: DashLink) => (l.price > 0 ? (l.rent * 12 * 100) / l.price : 0);

async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall through */ }
  try {
    const t = document.createElement("textarea");
    t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
    document.body.appendChild(t); t.select(); const ok = document.execCommand("copy"); t.remove(); return ok;
  } catch { return false; }
}

function CopyButton({ text, label, primary }: { text: string; label: string; primary?: boolean }) {
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  return (
    <button type="button" onClick={async () => { const ok = await copyText(text); setState(ok ? "ok" : "fail"); setTimeout(() => setState("idle"), 2200); }}
      className={clsx("inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg px-4 text-[14px] font-semibold transition-colors", primary ? "bg-blue-600 text-white hover:bg-blue-500" : "border border-slate-300 bg-white text-slate-800 hover:border-slate-400")}>
      {state === "ok" ? <><Check size={15} /> Kopieret</> : state === "fail" ? "Markér og kopiér manuelt" : <><Copy size={15} /> {label}</>}
    </button>
  );
}

export function BrokerDashboard({ origin, initial, legacy, admin, firstName }: { origin: string; initial: DashLink[]; legacy: DashLink[]; admin: boolean; firstName: string }) {
  const [links, setLinks] = useState<DashLink[]>(initial);
  const [open, setOpen] = useState<string | null>(initial[0]?.slug ?? null);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }, [toast]);

  const added = (l: DashLink) => { setLinks((x) => [l, ...x.filter((y) => y.slug !== l.slug)]); setOpen(l.slug); setToast("Analysen er oprettet. Vælg udseende, og kopiér koden."); setTimeout(() => document.getElementById(`link-${l.slug}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60); };
  const removed = async (slug: string) => {
    const r = await fetch("/api/maegler/links", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }) }).then((x) => x.json()).catch(() => null);
    if (r?.ok) { setLinks((x) => x.filter((y) => y.slug !== slug)); setToast("Analysen er slettet."); } else setToast("Analysen kunne ikke slettes. Prøv igen.");
  };

  return (
    <div className="mx-auto max-w-[1080px] px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-slate-900 sm:text-[34px]">{firstName ? `Hej ${firstName}` : "Investoranalyser til jeres sager"}</h1>
      <p className="mt-2 max-w-2xl text-[16px] leading-relaxed text-slate-600">Opret en investoranalyse af en sag, og sæt en NordInvest-knap på sagen på jeres hjemmeside. Køberne ser cash flow, afkast, renterisiko og 10 år frem, og kan selv ændre udbetaling og rente. Det er gratis.</p>

      <ol className="mt-6 grid gap-3 sm:grid-cols-3">
        {[["Find sagen", "Søg på adressen, eller indsæt linket fra Ejendomstorvet."], ["Vælg udseende", "Lys, mørk eller blå knap, med eller uden nøgletal."], ["Kopiér koden", "Sæt den ind på sagen på jeres hjemmeside. Færdig."]].map(([t, d], i) => (
          <li key={t} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[13px] font-semibold text-white">{i + 1}</span>
            <span><span className="block text-[15px] font-semibold text-slate-900">{t}</span><span className="block text-[14px] leading-snug text-slate-500">{d}</span></span>
          </li>
        ))}
      </ol>

      <AddCase onAdded={added} />

      <section className="mt-10">
        <h2 className="text-[20px] font-semibold text-slate-900">Jeres analyser {links.length > 0 && <span className="text-slate-400">{links.length}</span>}</h2>
        {links.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-[15px] text-slate-500">Ingen analyser endnu. Find jeres første sag ovenfor.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {links.map((l) => <LinkCard key={l.slug} l={l} origin={origin} open={open === l.slug} onToggle={() => setOpen(open === l.slug ? null : l.slug)} onDelete={() => removed(l.slug)} />)}
          </div>
        )}
      </section>

      {admin && legacy.length > 0 && (
        <details className="group mt-12 rounded-2xl border border-slate-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 [&::-webkit-details-marker]:hidden">
            <span>
              <span className="block text-[18px] font-semibold text-slate-900">Links fra mæglerudsendelserne <span className="text-slate-400">{legacy.length}</span></span>
              <span className="block text-[14px] text-slate-500">Kun for administratorer. Hver sag kan få en knap til mæglerens hjemmeside.</span>
            </span>
            <span className="shrink-0 text-[14px] font-semibold text-blue-700 group-open:hidden">Vis</span><span className="hidden shrink-0 text-[14px] font-semibold text-blue-700 group-open:inline">Skjul</span>
          </summary>
          <div className="space-y-4 border-t border-slate-100 p-4 sm:p-5">
            {legacy.map((l) => <LinkCard key={l.slug} l={l} origin={origin} open={open === l.slug} onToggle={() => setOpen(open === l.slug ? null : l.slug)} />)}
          </div>
        </details>
      )}

      {toast && <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-3 text-[14px] font-medium text-white shadow-xl">{toast}</div>}
    </div>
  );
}

/* ---------- Step 1: find the listing ---------- */

function AddCase({ onAdded }: { onAdded: (l: DashLink) => void }) {
  const [mode, setMode] = useState<"find" | "manual">("find");
  const [q, setQ] = useState("");
  const [state, setState] = useState<"idle" | "searching" | "done" | "error">("idle");
  const [cases, setCases] = useState<Case[]>([]);
  const [creating, setCreating] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const find = async (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim().length < 3) { setErr("Skriv mindst en vejnavn og et husnummer, eller indsæt et link."); return; }
    setErr(null); setState("searching");
    const r = await fetch(`/api/maegler/sager?q=${encodeURIComponent(q.trim())}`).then((x) => x.json()).catch(() => null);
    if (!r?.ok) { setState("error"); return; }
    setCases(r.cases); setState("done");
  };
  const create = async (c: Case) => {
    setCreating(c.id); setErr(null);
    const r = await fetch("/api/maegler/links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: c.url }) }).then((x) => x.json()).catch(() => null);
    setCreating(null);
    if (r?.ok) { onAdded(r.link); setQ(""); setCases([]); setState("idle"); } else setErr("Analysen kunne ikke oprettes. Prøv igen, eller indtast tallene selv.");
  };

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-20px_rgba(15,23,42,0.2)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[19px] font-semibold text-slate-900">Opret en analyse</h2>
        <div className="flex rounded-lg bg-slate-100 p-1 text-[14px] font-semibold">
          <button type="button" onClick={() => setMode("find")} className={clsx("rounded-md px-3 py-1.5", mode === "find" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>Find sagen</button>
          <button type="button" onClick={() => setMode("manual")} className={clsx("rounded-md px-3 py-1.5", mode === "manual" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>Indtast selv</button>
        </div>
      </div>

      {mode === "find" ? (
        <>
          <form onSubmit={find} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <label htmlFor="case-q" className="sr-only">Adresse eller link</label>
            <div className="relative min-w-0 flex-1">
              <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input id="case-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Adresse, fx Strandlodsvej 15, eller link fra Ejendomstorvet" autoComplete="off"
                className="h-12 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-[16px] focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <button type="submit" disabled={state === "searching"} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-[15px] font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
              {state === "searching" ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Find sagen
            </button>
          </form>
          <p className="mt-2 text-[13px] text-slate-500">Vi finder investeringssager på Ejendomstorvet og henter pris, afkast og billeder automatisk.</p>
          {err && <p role="alert" className="mt-3 text-[14px] font-medium text-rose-600">{err}</p>}
          {state === "error" && <p role="alert" className="mt-3 text-[14px] font-medium text-rose-600">Søgningen mislykkedes. Prøv igen, eller indtast tallene selv.</p>}
          {state === "done" && cases.length === 0 && (
            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-[14px] text-slate-600">
              Ingen investeringssag fundet med et afkast. Kontrollér adressen, eller <button type="button" onClick={() => setMode("manual")} className="font-semibold text-blue-700 underline underline-offset-2">indtast tallene selv</button>.
            </div>
          )}
          {cases.length > 0 && (
            <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
              {cases.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {c.image ? <img src={c.image} alt="" className="h-14 w-20 shrink-0 rounded-lg object-cover" /> : <span className="h-14 w-20 shrink-0 rounded-lg bg-slate-100" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-slate-900">{c.addr}</span>
                    <span className="block text-[13px] text-slate-500">{kr(c.price)} · {pct(c.yieldPct)} afkast{c.subcat ? ` · ${c.subcat}` : ""}{c.agency ? ` · ${c.agency}` : ""}</span>
                  </span>
                  <button type="button" onClick={() => create(c)} disabled={!!creating} className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg bg-slate-900 px-4 text-[14px] font-semibold text-white hover:bg-slate-800 disabled:opacity-60 max-sm:w-full max-sm:justify-center">
                    {creating === c.id ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Opret analyse
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : <ManualForm onAdded={onAdded} />}
    </section>
  );
}

function ManualForm({ onAdded }: { onAdded: (l: DashLink) => void }) {
  const [f, setF] = useState({ addr: "", price: "", yieldPct: "", subcat: "Boligudlejning", url: "", image: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setFail(false);
    const r = await fetch("/api/maegler/links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ manual: { ...f, price: Number(f.price.replace(/\D/g, "")) } }) }).then((x) => x.json()).catch(() => null);
    setBusy(false);
    if (r?.ok) { onAdded(r.link); setF({ addr: "", price: "", yieldPct: "", subcat: "Boligudlejning", url: "", image: "" }); setErrors({}); }
    else if (r?.errors) setErrors(r.errors); else setFail(true);
  };
  const input = (bad?: string) => clsx("mt-1.5 h-11 w-full rounded-lg border bg-white px-3 text-[16px] focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100", bad ? "border-rose-400" : "border-slate-300");
  const E = ({ k }: { k: string }) => (errors[k] ? <p className="mt-1 text-[13px] font-medium text-rose-600">{errors[k]}</p> : null);
  return (
    <form onSubmit={submit} noValidate className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className="block sm:col-span-2"><span className="text-[14px] font-medium text-slate-700">Adresse</span><input value={f.addr} onChange={set("addr")} placeholder="Vestergade 12, 8000 Aarhus C" className={input(errors.addr)} /><E k="addr" /></label>
      <label className="block"><span className="text-[14px] font-medium text-slate-700">Udbudspris (kr.)</span><input value={f.price} onChange={set("price")} inputMode="numeric" placeholder="4.500.000" className={input(errors.price)} /><E k="price" /></label>
      <label className="block"><span className="text-[14px] font-medium text-slate-700">Afkast (%)</span><input value={f.yieldPct} onChange={set("yieldPct")} inputMode="decimal" placeholder="6,2" className={input(errors.yieldPct)} /><E k="yieldPct" /></label>
      <label className="block"><span className="text-[14px] font-medium text-slate-700">Type</span>
        <select value={f.subcat} onChange={set("subcat")} className={input()}>
          {["Boligudlejning", "Detailhandel & butik", "Kontor", "Lager & produktion", "Hotel & restaurant", "Andre typer"].map((t) => <option key={t}>{t}</option>)}
        </select>
      </label>
      <label className="block"><span className="text-[14px] font-medium text-slate-700">Link til sagen <span className="font-normal text-slate-400">(valgfrit)</span></span><input value={f.url} onChange={set("url")} placeholder="https://" className={input(errors.url)} /><E k="url" /></label>
      <label className="block sm:col-span-2"><span className="text-[14px] font-medium text-slate-700">Link til et billede <span className="font-normal text-slate-400">(valgfrit)</span></span><input value={f.image} onChange={set("image")} placeholder="https://" className={input(errors.image)} /><E k="image" /></label>
      {fail && <p role="alert" className="text-[14px] font-medium text-rose-600 sm:col-span-2">Analysen kunne ikke oprettes. Prøv igen.</p>}
      <div className="sm:col-span-2">
        <button type="submit" disabled={busy} className="inline-flex min-h-[46px] items-center gap-2 rounded-lg bg-blue-600 px-5 text-[15px] font-semibold text-white hover:bg-blue-500 disabled:opacity-60">{busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Opret analyse</button>
        <p className="mt-2 text-[13px] text-slate-500">Afkastet er nettoafkastet fra salgsopstillingen (driftsresultat i procent af prisen).</p>
      </div>
    </form>
  );
}

/* ---------- A link and its website button ---------- */

function LinkCard({ l, origin, open, onToggle, onDelete }: { l: DashLink; origin: string; open: boolean; onToggle: () => void; onDelete?: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const url = `${origin}/e/${l.slug}`;
  const img = l.imgs?.[0];
  return (
    <article id={`link-${l.slug}`} className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap sm:p-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {img ? <img src={img} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" /> : <span className="h-16 w-24 shrink-0 rounded-lg bg-slate-100" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold text-slate-900">{l.addr}</p>
          <p className="text-[14px] text-slate-500">{kr(l.price)} · {pct(yieldOf(l))} afkast{l.subcat ? ` · ${l.subcat}` : ""}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[13px] text-slate-500">
            <span className="inline-flex items-center gap-1"><Eye size={13} /> {l.views ?? 0} {l.views === 1 ? "visning" : "visninger"}</span>
            <span className="truncate text-blue-700">{url.replace(/^https?:\/\//, "")}</span>
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-nowrap">
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-[14px] font-semibold text-slate-800 hover:border-slate-400">Åbn <ArrowUpRight size={15} /></a>
          <CopyButton text={url} label="Kopiér link" />
          <button type="button" onClick={onToggle} aria-expanded={open} className={clsx("inline-flex min-h-[42px] items-center gap-1.5 rounded-lg px-3.5 text-[14px] font-semibold", open ? "bg-slate-900 text-white" : "bg-blue-600 text-white hover:bg-blue-500")}>
            {open ? <X size={15} /> : <Code2 size={15} />} {open ? "Luk" : "Sæt på hjemmesiden"}
          </button>
        </div>
      </div>
      {open && <Builder l={l} origin={origin} />}
      {onDelete && open && (
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3 text-[14px]">
          {confirm ? (
            <><span className="text-slate-600">Slet analysen? Linket holder op med at virke.</span>
              <button type="button" onClick={() => setConfirm(false)} className="rounded-lg px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-100">Annullér</button>
              <button type="button" onClick={onDelete} className="rounded-lg bg-rose-600 px-3 py-1.5 font-semibold text-white hover:bg-rose-500">Slet</button></>
          ) : (
            <button type="button" onClick={() => setConfirm(true)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /> Slet analysen</button>
          )}
        </div>
      )}
    </article>
  );
}

function Chips<T extends string>({ label, options, value, onChange }: { label: string; options: Record<T, string>; value: T; onChange: (v: T) => void }) {
  return (
    <div>
      <p className="text-[13px] font-semibold text-slate-500">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
        {(Object.keys(options) as T[]).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={value === k} onClick={() => onChange(k)}
            className={clsx("min-h-[38px] rounded-full px-3.5 text-[14px] font-semibold ring-1 ring-inset", value === k ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-700 ring-slate-300 hover:ring-slate-400")}>{options[k]}</button>
        ))}
      </div>
    </div>
  );
}

const HOW = {
  elementor: { label: "WordPress (Elementor)", steps: ["Åbn sagen i WordPress, og klik Rediger med Elementor.", "Søg efter widgetten HTML i venstre side, og træk den hen, hvor knappen skal stå.", "Indsæt koden i feltet, og klik Opdater."] },
  wordpress: { label: "WordPress (klassisk)", steps: ["Åbn sagen i WordPress.", "Vælg fanen Tekst (eller tilføj blokken Brugerdefineret HTML).", "Indsæt koden, hvor knappen skal stå, og klik Opdater."] },
  andet: { label: "Andet system", steps: ["Find et felt til HTML eller kildekode på sagen, fx en HTML-blok eller knappen <> i teksteditoren.", "Indsæt koden, og gem.", "Kan systemet kun lave links, så brug linket under Link og e-mail som knap eller tekstlink."] },
  link: { label: "Link og e-mail", steps: ["Kopiér linket, og sæt det på sagen som et link eller en knap med teksten Se investoranalysen.", "Linket kan også sendes direkte til købere på mail eller sættes i salgsopstillingen."] },
} as const;

function Builder({ l, origin }: { l: DashLink; origin: string }) {
  const [o, setO] = useState<BadgeOptions>(DEFAULT_BADGE);
  const [how, setHow] = useState<keyof typeof HOW>("elementor");
  const html = useMemo(() => badgeHtml(l.slug, l.addr, o, origin), [l.slug, l.addr, o, origin]);
  const { w, h } = badgeSize(o);
  const url = `${origin}/e/${l.slug}`;
  const street = l.addr.split(",")[0];
  const mailText = `Se investoranalysen af ${street} med cash flow, afkast og renterisiko: ${url}`;
  // The exact snippet, rendered the way a listing page would show it.
  const testDoc = (bg: string) => `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:18px;background:${bg};font-family:-apple-system,Segoe UI,Arial,sans-serif}</style></head><body>${html}</body></html>`;

  return (
    <div className="border-t border-slate-200 bg-slate-50/60 p-4 sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-slate-900"><PenLine size={16} className="text-blue-600" /> Udseende</p>
          <Chips label="Farve" options={THEMES} value={o.tema} onChange={(tema) => setO({ ...o, tema })} />
          <Chips label="Tekst" options={TEXTS} value={o.tekst} onChange={(tekst) => setO({ ...o, tekst })} />
          <Chips label="Nøgletal på knappen" options={{ ja: "Vis afkast og cash flow", nej: "Skjul" }} value={o.tal ? "ja" : "nej"} onChange={(v) => setO({ ...o, tal: v === "ja" })} />
          <Chips label="Størrelse" options={SIZES} value={o.str} onChange={(str) => setO({ ...o, str })} />
          <Chips label="Hjørner" options={CORNERS} value={o.hj} onChange={(hj) => setO({ ...o, hj })} />
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-slate-900"><MonitorSmartphone size={16} className="text-blue-600" /> Sådan ser den ud på sagen</p>
          <div className="mt-3 grid gap-2">
            {["#ffffff", "#f1f1ef"].map((bg) => (
              <iframe key={bg} title={`Forhåndsvisning på ${bg === "#ffffff" ? "hvid" : "grå"} baggrund`} srcDoc={testDoc(bg)} sandbox="allow-popups allow-popups-to-escape-sandbox" className="w-full rounded-xl border border-slate-200" style={{ height: h + 40 }} />
            ))}
          </div>
          <p className="mt-2 text-[13px] text-slate-500">Forhåndsvisningen bruger præcis den kode, I kopierer. Knappen er {w} × {h} pixel og skalerer ned på mobil. Klik på den for at teste linket.</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-slate-900"><Code2 size={16} className="text-blue-600" /> Sæt den på jeres hjemmeside</p>
        <div className="mt-3 flex flex-wrap gap-1.5" role="tablist">
          {(Object.keys(HOW) as (keyof typeof HOW)[]).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={how === k} onClick={() => setHow(k)}
              className={clsx("min-h-[38px] rounded-lg px-3 text-[14px] font-semibold", how === k ? "bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-200" : "text-slate-600 hover:bg-slate-100")}>{HOW[k].label}</button>
          ))}
        </div>
        <ol className="mt-4 space-y-2">
          {HOW[how].steps.map((s, i) => (
            <li key={s} className="flex gap-3 text-[15px] text-slate-700"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[12px] font-semibold text-white">{i + 1}</span><span>{s}</span></li>
          ))}
        </ol>
        {how === "link" ? (
          <div className="mt-4 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="min-w-0 flex-1 select-all overflow-x-auto whitespace-nowrap rounded-lg bg-slate-100 px-3 py-2.5 text-[14px] text-slate-800"><Link2 size={13} className="mr-1.5 inline" />{url}</code>
              <CopyButton text={url} label="Kopiér link" primary />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <p className="min-w-0 flex-1 select-all rounded-lg bg-slate-100 px-3 py-2.5 text-[14px] text-slate-800">{mailText}</p>
              <CopyButton text={mailText} label="Kopiér tekst" />
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <textarea readOnly value={html} rows={4} onFocus={(e) => e.currentTarget.select()} aria-label="HTML-kode til knappen"
              className="w-full resize-none rounded-lg border border-slate-200 bg-slate-900 p-3 font-mono text-[12.5px] leading-relaxed text-slate-100" />
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <CopyButton text={html} label="Kopiér koden" primary />
              <span className="text-[13px] text-slate-500">Koden er et almindeligt link med et billede. Den virker i alle systemer, der tillader HTML.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

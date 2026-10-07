"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Check, ChevronDown, ExternalLink, Info, Loader2, ShieldAlert } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { NumberInput } from "@/components/ui/NumberInput";
import { DEFAULT_ANSWERS, PRICES_FETCHED, flip, region, renovationLines, stress, type FlipAnswers, type Line, type Property, type TaxCase } from "@/lib/flip/model";
import type { FlipComp, FlipMarket } from "@/lib/flip/market";

const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const signed = (n: number) => (Math.round(n) === 0 ? "0 kr." : `${n > 0 ? "+" : "−"}${Math.abs(Math.round(n)).toLocaleString("da-DK")} kr.`);
const pct = (n: number, d = 0) => `${(n * 100).toLocaleString("da-DK", { maximumFractionDigits: d, minimumFractionDigits: d })} %`;
const EASE = [0.2, 0.7, 0.2, 1] as const;

type Listing = { url: string; address: string | null; zip: string | null; price: number | null; area: number | null; rooms: number | null; yearBuilt: number | null; monthlyExpenses: number | null; images: string[] };

const TAX_LABEL: Record<TaxCase, { title: string; body: string }> = {
  live_in: { title: "Bo og flip", body: "Parcelhusreglen: har du boet i boligen, er gevinsten skattefri. Grunden skal være under 1.400 m², og du skal kunne dokumentere, at du har boet der (folkeregister, forbrug)." },
  private: { title: "Privat salg", body: "Gevinsten beskattes som kapitalindkomst med op til 42 % efter et fradrag på 10.000 kr. pr. år, du har ejet boligen. Renterne trækkes fra for sig." },
  business: { title: "Næring", body: "Køber og sælger du boliger jævnligt, kan Skattestyrelsen se dig som næringsdrivende. Så beskattes gevinsten som personlig indkomst, op til ca. 52 %." },
};

export function FlipReport() {
  const sp = useSearchParams();
  const url = sp.get("url") ?? "";
  const seed = useMemo(() => {
    try {
      return JSON.parse(atob(sp.get("a") ?? "")) as FlipAnswers & { type?: Property["type"] };
    } catch {
      return null;
    }
  }, [sp]);

  const [listing, setListing] = useState<Listing | null>(null);
  const [market, setMarket] = useState<FlipMarket | null>(null);
  const [answers, setAnswers] = useState<FlipAnswers>({ ...DEFAULT_ANSWERS, ...(seed ?? {}) });
  const [type] = useState<Property["type"]>(seed?.type ?? "villa");
  const [arv, setArv] = useState<number | null>(null);
  const [arvTouched, setArvTouched] = useState(false);
  const [price, setPrice] = useState<number | null>(null);
  const [lines, setLines] = useState<Line[] | null>(null);
  const [failed, setFailed] = useState(false);

  // The listing: from the journey (sessionStorage) or fetched again.
  useEffect(() => {
    let stored: { listing?: Listing } | null = null;
    try { stored = JSON.parse(sessionStorage.getItem("ni_journey") ?? "null"); } catch { /* none */ }
    if (stored?.listing && stored.listing.url === url && stored.listing.price) {
      setListing(stored.listing);
      return;
    }
    fetch(`/api/extract?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((d) => {
        const f = (d?.fields ?? {}) as Record<string, string | number>;
        const address = f.address ? String(f.address) : null;
        setListing({ url, address, zip: address?.match(/\b(\d{4})\b/)?.[1] ?? null, price: Number(f.price) || null, area: Number(f.area) || null, rooms: Number(f.rooms) || null, yearBuilt: Number(f.yearBuilt) || null, monthlyExpenses: Number(f.monthlyExpenses) || null, images: Array.isArray(d?.images) ? d.images.slice(0, 12) : [] });
      })
      .catch(() => setFailed(true));
  }, [url]);

  useEffect(() => {
    if (!listing?.zip || !listing.area) return;
    setPrice((p) => p ?? listing.price);
    fetch(`/api/flip/market?zip=${listing.zip}&type=${type}&area=${listing.area}${listing.yearBuilt ? `&year=${listing.yearBuilt}` : ""}`)
      .then((r) => r.json())
      .then((m: FlipMarket) => setMarket(m))
      .catch(() => setMarket({ ok: false, reason: "fetch_failed" }));
  }, [listing, type]);

  const property = useMemo<Property | null>(
    () =>
      listing?.area && (price ?? listing.price)
        ? { price: price ?? listing.price!, area: listing.area, rooms: listing.rooms, yearBuilt: listing.yearBuilt, zip: listing.zip ?? "8000", monthlyExpenses: listing.monthlyExpenses, type }
        : null,
    [listing, price, type],
  );

  // Lines follow the level until the user edits one.
  const [linesTouched, setLinesTouched] = useState(false);
  useEffect(() => {
    if (property && !linesTouched) setLines(renovationLines(property, answers));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property?.area, property?.rooms, answers.level, linesTouched]);

  // ARV: renovated median per m² × area; falls back to the upper quartile of all.
  const suggestedArv = useMemo(() => {
    if (!property) return null;
    if (market?.ok && market.medianRenovated) return Math.round((market.medianRenovated * property.area) / 5000) * 5000;
    if (market?.ok) {
      const all = market.comps.map((c) => c.perM2).sort((a, b) => a - b);
      const q3 = all[Math.floor(all.length * 0.75)] ?? null;
      return q3 ? Math.round((q3 * property.area) / 5000) * 5000 : null;
    }
    return null;
  }, [market, property]);
  useEffect(() => {
    if (!arvTouched && suggestedArv) setArv(suggestedArv);
  }, [suggestedArv, arvTouched]);

  const result = useMemo(() => (property && arv && lines ? flip(property, arv, answers, lines) : null), [property, arv, answers, lines]);
  const grid = useMemo(() => (property && arv && lines ? stress(property, arv, answers, lines) : null), [property, arv, answers, lines]);

  if (failed) return <Shell><p className="mt-20 text-center text-slate-600">Vi kunne ikke hente boligen. <Link className="text-blue-700 underline" href="/analyseren/start">Prøv igen</Link></p></Shell>;
  if (!listing || !market || !result || !property || !grid) {
    return (
      <Shell>
        <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
          <Loader2 className="animate-spin text-blue-600" size={28} />
          <p className="mt-5 text-[20px] font-semibold tracking-[-0.02em]">Bygger din flip-analyse</p>
          <p className="mt-2 text-[15px] text-slate-500">Sammenligner med renoverede og urenoverede boliger i postnummeret</p>
        </div>
      </Shell>
    );
  }

  const good = result.profit > 0 && result.margin >= answers.target / 100;
  const ok = result.profit > 0;
  const verdict = good ? "Det kan blive en god flip." : ok ? "Der er penge i den, men for lidt." : "Den regner ikke som flip til den pris.";
  const set = (patch: Partial<FlipAnswers>) => setAnswers((a) => ({ ...a, ...patch }));
  const comps = market.ok ? market.comps : [];

  return (
    <Shell>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0a0e16] text-white">
        {listing.images[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.images[0]} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e16] via-[#0a0e16]/80 to-[#0a0e16]/30" />
        <div className="relative mx-auto max-w-[1080px] px-4 pb-10 pt-14 sm:px-6 sm:pb-14 sm:pt-20">
          <p className="text-sm font-medium text-blue-300">{answers.strategy === "live_flip" ? "Bo og flip" : "Flip"} · {listing.address ?? "Boligen"}</p>
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="mt-3 max-w-3xl text-[36px] font-semibold leading-[1.05] tracking-[-0.035em] [text-wrap:balance] sm:text-[56px]">
            {verdict}
          </motion.h1>
          <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-4">
            {[
              ["Fortjeneste efter skat", signed(result.profit), ok ? "text-emerald-300" : "text-rose-300"],
              ["Dit maksimale bud", kr(result.maxBid), "text-white", `for ${answers.target} % fortjeneste`],
              ["Udbudspris", kr(property.price), "text-white"],
              ["Afkast på din egen kapital", pct(result.roi), ok ? "text-white" : "text-rose-300", `${pct(result.annualised)} om året`],
            ].map(([k, v, tone, sub]) => (
              <div key={k} className="bg-[#0f1522]/90 p-4 sm:p-5">
                <dt className="text-xs text-slate-400">{k}</dt>
                <dd className={clsx("mt-1 text-[22px] font-semibold tabular-nums sm:text-[26px]", tone)}>{v}</dd>
                {sub && <dd className="text-xs text-slate-400">{sub}</dd>}
              </div>
            ))}
          </dl>
          <p className="mt-4 max-w-2xl text-sm text-slate-400">
            {property.price > result.maxBid
              ? `Udbudsprisen ligger ${kr(property.price - result.maxBid)} over dit maksimale bud. Byd ${kr(result.maxBid)} eller mindre, eller lav en billigere renovering.`
              : `Du har ${kr(result.maxBid - property.price)} at give af i forhandlingen og stadig nå ${answers.target} %.`}
          </p>
        </div>
      </section>

      {/* ARV */}
      <Band id="vaerdi" title="Hvad er den værd efter renoveringen?" answer={market.ok && market.medianRenovated ? `Renoverede boliger i ${market.zip} er sat til salg til ${kr(market.medianRenovated)} pr. m²` : "For få renoverede boliger i postnummeret til en sikker værdi"} tone={market.ok && market.medianRenovated ? "good" : "warn"}>
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <PerM2Bars market={market} asking={property.price / property.area} />
            <label className="mt-6 block">
              <span className="text-sm font-medium text-slate-700">Salgspris efter renovering</span>
              <div className="mt-1.5 flex items-center gap-3">
                <NumberInput value={arv ?? 0} onValueChange={(n) => { setArv(n ?? 0); setArvTouched(true); }} className="h-12 w-full rounded-xl border border-slate-200 px-4 text-lg font-semibold tabular-nums outline-none focus:border-blue-500" />
                {arvTouched && suggestedArv && (
                  <button type="button" onClick={() => { setArv(suggestedArv); setArvTouched(false); }} className="shrink-0 text-sm text-blue-700 underline underline-offset-2">Nulstil</button>
                )}
              </div>
              <span className="mt-1.5 block text-[13px] text-slate-500">
                {suggestedArv ? `Vores bud: ${kr(suggestedArv)} (${property.area} m² × median for renoverede). Kender du området bedre, så ret den.` : "Indtast din egen salgspris."}
              </span>
            </label>
          </div>
          <CompList comps={comps} />
        </div>
      </Band>

      {/* Renovation */}
      <Band id="renovering" muted title="Hvad koster renoveringen?" answer={`${kr(result.costs.renovation)} inkl. ${pct(answers.level === "cosmetic" ? 0.1 : answers.level === "medium" ? 0.15 : 0.2)} til uforudsete udgifter`} tone="neutral">
        <div className="flex flex-wrap gap-2">
          {(["cosmetic", "medium", "total"] as const).map((l) => (
            <button key={l} type="button" onClick={() => { set({ level: l }); setLinesTouched(false); }} className={clsx("rounded-full border px-4 py-2 text-sm font-semibold", answers.level === l ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300")}>
              {l === "cosmetic" ? "Opfriskning" : l === "medium" ? "Køkken og bad" : "Totalrenovering"}
            </button>
          ))}
        </div>
        <RenovationTable lines={lines!} zip={property.zip} onChange={(ls) => { setLines(ls); setLinesTouched(true); }} />
        <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Fig k="Materialer" v={kr(result.costs.materials)} sub={answers.role === "tradesman" || answers.role === "contractor" ? "med 15 % fagrabat" : "butikspriser inkl. moms"} />
          <Fig k="Håndværkere" v={kr(result.costs.labour)} sub={`timepriser ${region(property.zip) === "kbh" ? "i København" : region(property.zip) === "sj" ? "på Sjælland" : "i Jylland og på Fyn"}, inkl. moms`} />
          <Fig k="Uforudsete udgifter" v={kr(result.costs.buffer)} sub="skjulte fejl findes altid" />
          <Fig k="Dine egne timer" v={`${Math.round(result.costs.diyHours)} t`} sub={result.costs.diyHours ? "det du selv laver" : "alt udføres af håndværkere"} />
        </dl>
        <p className="mt-4 flex items-start gap-2 text-[13px] text-slate-500">
          <Info size={14} className="mt-0.5 shrink-0" />
          Materialepriser er hentet fra Silvan og XL-BYG den {new Date(PRICES_FETCHED).toLocaleDateString("da-DK")}. Linjer markeret &quot;skøn&quot; har ingen offentlig pris, så ret dem, hvis du har et tilbud.
        </p>
      </Band>

      {/* Waterfall */}
      <Band id="regnestykket" title="Hele regnestykket" answer={`${signed(result.profit)} efter skat, ${pct(result.margin, 1)} af salgsprisen`} tone={good ? "good" : ok ? "warn" : "bad"}>
        <Waterfall rows={result.waterfall} />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Fig k="Købsomkostninger" v={kr(result.buy.total)} sub={`Skøde ${kr(result.buy.tinglysning)}${result.buy.pant ? `, pant ${kr(result.buy.pant)}` : ""}, rådgiver ${kr(result.buy.lawyer)}`} />
          <Fig k={`Ejertid, ${answers.months} mdr.`} v={kr(result.hold.total)} sub={`Renter ${kr(result.hold.interest)}, ejerudgift og forbrug ${kr(result.hold.running)}`} />
          <Fig k="Salgsomkostninger" v={kr(result.sell.total)} sub={`Mægler ${kr(result.sell.broker)}, rapporter ${kr(result.sell.reports)}, øvrigt ${kr(result.sell.other)}`} />
        </div>
        <div className="mt-6 flex flex-wrap items-end gap-4">
          <Ctl label="Måneder fra køb til salg" value={answers.months} onChange={(n) => set({ months: n })} />
          <Ctl label="Rente %" value={answers.rate} onChange={(n) => set({ rate: n })} decimals={1} />
          <Ctl label="Krævet fortjeneste %" value={answers.target} onChange={(n) => set({ target: n })} />
          <Ctl label="Købspris" value={property.price} onChange={(n) => setPrice(n)} wide />
        </div>
      </Band>

      {/* Tax */}
      <Band id="skat" muted title="Hvad tager skatten?" answer={result.taxCase === "live_in" ? "Skattefri, hvis du bor i boligen" : `${kr(result.tax)} i skat ved ${TAX_LABEL[result.taxCase].title.toLowerCase()}`} tone={result.taxCase === "live_in" ? "good" : "neutral"}>
        <div className="grid gap-3 md:grid-cols-3">
          {(["live_in", "private", "business"] as const).map((t) => (
            <div key={t} className={clsx("rounded-2xl border p-5", t === result.taxCase ? "border-blue-500 bg-white shadow-card" : "border-slate-200 bg-white/60")}>
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-semibold">{TAX_LABEL[t].title}</span>
                {t === result.taxCase && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">Din situation</span>}
              </div>
              <div className="mt-2 text-[22px] font-semibold tabular-nums">{kr(result.taxByCase[t])}</div>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{TAX_LABEL[t].body}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[13px] text-slate-500">Skatten er vejledende og afhænger af din øvrige indkomst. Tal med en revisor, før du køber.</p>
      </Band>

      {/* Stress */}
      <Band id="risiko" title="Hvad hvis det går skævt?" answer={grid.rows[2].values[2] >= 0 ? "Den holder også i det værste scenarie" : "Et dårligt salg og en dyr renovering æder fortjenesten"} tone={grid.rows[2].values[2] >= 0 ? "good" : "warn"}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-separate border-spacing-1 text-sm">
            <thead>
              <tr>
                <th />
                {grid.cols.map((c) => <th key={c} className="px-2 pb-2 text-left text-xs font-medium text-slate-500">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {grid.rows.map((r) => (
                <tr key={r.label}>
                  <th className="pr-3 text-left text-xs font-medium text-slate-500">{r.label}</th>
                  {r.values.map((v, i) => (
                    <td key={i} className={clsx("rounded-lg px-3 py-3 text-right font-semibold tabular-nums", v >= result.profit * 0.66 && v > 0 ? "bg-emerald-50 text-emerald-800" : v > 0 ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-700")}>{signed(v)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[13px] text-slate-500">Fortjeneste efter skat. Du skal kunne sælge til mindst {kr(result.breakEvenArv)} for ikke at tabe penge.</p>
      </Band>

      {/* Checklist */}
      <Band id="tjekliste" muted title="Før du byder" answer="Det, flippere oftest bliver ramt af" tone="neutral">
        <Checklist answers={answers} year={property.yearBuilt} />
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/analyseren?url=${encodeURIComponent(url)}`} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:border-slate-300">
            Se den som udlejning i stedet <ArrowUpRight size={15} />
          </Link>
          <Link href="/analyseren/start" className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-btn hover:bg-blue-700">
            Analysér en ny bolig
          </Link>
        </div>
      </Band>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="bg-white text-slate-900">{children}</div>;
}

function Band({ id, title, answer, tone, muted, children }: { id: string; title: string; answer: string; tone: "good" | "warn" | "bad" | "neutral"; muted?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className={clsx("px-4 py-12 sm:px-6 sm:py-16", muted ? "bg-[#f4f6f9]" : "bg-white")}>
      <div className="mx-auto max-w-[1080px]">
        <h2 className="text-[26px] font-semibold tracking-[-0.03em] [text-wrap:balance] sm:text-[32px]">{title}</h2>
        <p className={clsx("mt-2 text-[17px] font-medium", tone === "good" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : tone === "bad" ? "text-rose-600" : "text-slate-600")}>{answer}</p>
        <div className="mt-7">{children}</div>
      </div>
    </section>
  );
}

function Fig({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="min-w-0 border-t border-slate-200 pt-3">
      <dt className="text-xs text-slate-500">{k}</dt>
      <dd className="mt-1 text-[20px] font-semibold tabular-nums">{v}</dd>
      {sub && <dd className="text-[12px] leading-snug text-slate-500">{sub}</dd>}
    </div>
  );
}

function Ctl({ label, value, onChange, decimals = 0, wide }: { label: string; value: number; onChange: (n: number) => void; decimals?: number; wide?: boolean }) {
  return (
    <label className={clsx("block", wide ? "w-48" : "w-36")}>
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <NumberInput value={value} decimals={decimals} onValueChange={(n) => n != null && onChange(n)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-semibold tabular-nums outline-none focus:border-blue-500" />
    </label>
  );
}

function PerM2Bars({ market, asking }: { market: FlipMarket; asking: number }) {
  if (!market.ok) return <p className="text-sm text-slate-500">Ingen sammenlignelige boliger til salg lige nu.</p>;
  const rows = [
    { label: "Trænger til renovering", v: market.medianNeedsWork, n: market.comps.filter((c) => c.condition === "needs_work").length, color: "bg-amber-400" },
    { label: "Denne bolig (udbudspris)", v: asking, n: null, color: "bg-slate-900" },
    { label: "Standard", v: market.medianStandard, n: market.comps.filter((c) => c.condition === "standard").length, color: "bg-slate-300" },
    { label: "Renoveret", v: market.medianRenovated, n: market.comps.filter((c) => c.condition === "renovated").length, color: "bg-emerald-500" },
  ];
  const max = Math.max(...rows.map((r) => r.v ?? 0)) || 1;
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex justify-between text-[13px]">
            <span className="text-slate-700">{r.label}{r.n != null && <span className="text-slate-400"> · {r.n} boliger</span>}</span>
            <span className="font-semibold tabular-nums">{r.v ? `${Math.round(r.v).toLocaleString("da-DK")} kr./m²` : "for få"}</span>
          </div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <motion.div className={clsx("h-full rounded-full", r.color)} initial={{ width: 0 }} whileInView={{ width: `${((r.v ?? 0) / max) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.8, ease: EASE }} />
          </div>
        </div>
      ))}
      <p className="pt-1 text-[12px] text-slate-500">Median udbudspris pr. m² for {market.sample} boliger til salg i {market.zip} af samme type og størrelse. Hver bolig er sorteret efter, hvad dens egen annonce siger om standen.</p>
    </div>
  );
}

function CompList({ comps }: { comps: FlipComp[] }) {
  const [filter, setFilter] = useState<"renovated" | "needs_work">("renovated");
  // The most typical ones first: closest to the group's median price per m².
  const group = comps.filter((c) => c.condition === filter);
  const mid = [...group].sort((a, b) => a.perM2 - b.perM2)[Math.floor(group.length / 2)]?.perM2 ?? 0;
  const list = [...group].sort((a, b) => Math.abs(a.perM2 - mid) - Math.abs(b.perM2 - mid)).slice(0, 6);
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white">
      <div className="flex gap-1 border-b border-slate-100 p-2">
        {(["renovated", "needs_work"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={clsx("rounded-full px-3 py-1.5 text-[13px] font-semibold", filter === f ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50")}>
            {f === "renovated" ? "Renoverede" : "Trænger til renovering"}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="p-5 text-sm text-slate-500">Ingen i postnummeret lige nu.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {list.map((c) => (
            <li key={c.url + c.price}>
              <a href={c.url} target="_blank" rel="noopener noreferrer" className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 p-3 hover:bg-slate-50">
                {c.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image} alt="" loading="lazy" className="h-12 w-16 rounded-lg object-cover" />
                ) : <span className="h-12 w-16 rounded-lg bg-slate-100" />}
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold">{c.address}</span>
                  <span className="block truncate text-[12px] text-slate-500">
                    {c.area} m²{c.yearBuilt ? ` · ${c.yearBuilt}` : ""}{c.evidence ? ` · "${c.evidence.toLowerCase()}"` : ""}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-[14px] font-semibold tabular-nums">{c.perM2.toLocaleString("da-DK")} kr./m²</span>
                  <span className="block text-[12px] tabular-nums text-slate-500">{kr(c.price)}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RenovationTable({ lines, zip, onChange }: { lines: Line[]; zip: string; onChange: (l: Line[]) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const groups = Array.from(new Set(lines.map((l) => l.group)));
  const patch = (id: string, p: Partial<Line>) => onChange(lines.map((l) => (l.id === id ? { ...l, ...p } : l)));
  void zip;
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {groups.map((g) => {
        const gl = lines.filter((l) => l.group === g);
        const mat = gl.reduce((s, l) => s + l.qty * l.unitPrice, 0);
        const isOpen = open === g;
        return (
          <div key={g} className="border-b border-slate-100 last:border-0">
            <button type="button" onClick={() => setOpen(isOpen ? null : g)} className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left hover:bg-slate-50 sm:px-5">
              <span className="text-[15px] font-semibold">{g}</span>
              <span className="flex items-center gap-3 text-[14px] tabular-nums text-slate-600">
                {kr(mat)} i materialer
                <ChevronDown size={16} className={clsx("transition-transform", isOpen && "rotate-180")} />
              </span>
            </button>
            {isOpen && (
              <ul className="space-y-3 px-4 pb-4 sm:px-5">
                {gl.map((l) => (
                  <li key={l.id} className="rounded-xl bg-slate-50 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold">{l.label}</div>
                        {l.product ? (
                          <a href={l.product.url} target="_blank" rel="noopener noreferrer sponsored" className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate text-[12px] text-blue-700 underline-offset-2 hover:underline">
                            {l.product.store}: {l.product.name} <ExternalLink size={11} className="shrink-0" />
                          </a>
                        ) : (
                          <span className="mt-0.5 block text-[12px] text-amber-700">Skøn{l.note ? `: ${l.note.replace(/^Skøn: /, "")}` : ""}</span>
                        )}
                      </div>
                      <span className="text-[14px] font-semibold tabular-nums">{kr(l.qty * l.unitPrice)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[12px]">
                      <label className="flex items-center gap-1.5">
                        <span className="text-slate-500">Antal</span>
                        <NumberInput value={l.qty} decimals={0} onValueChange={(n) => n != null && patch(l.id, { qty: n })} className="h-8 w-20 rounded-lg border border-slate-200 bg-white px-2 tabular-nums outline-none focus:border-blue-500" />
                        <span className="text-slate-500">{l.unit}</span>
                      </label>
                      <label className="flex items-center gap-1.5">
                        <span className="text-slate-500">á</span>
                        <NumberInput value={Math.round(l.unitPrice)} decimals={0} onValueChange={(n) => n != null && patch(l.id, { unitPrice: n })} className="h-8 w-24 rounded-lg border border-slate-200 bg-white px-2 tabular-nums outline-none focus:border-blue-500" />
                        <span className="text-slate-500">kr.</span>
                      </label>
                      {l.trade && (
                        <label className="flex items-center gap-1.5">
                          <NumberInput value={l.hours} decimals={0} onValueChange={(n) => n != null && patch(l.id, { hours: n })} className="h-8 w-16 rounded-lg border border-slate-200 bg-white px-2 tabular-nums outline-none focus:border-blue-500" />
                          <span className="text-slate-500">timer {l.trade}</span>
                        </label>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Waterfall({ rows }: { rows: { label: string; value: number; kind: string; note?: string }[] }) {
  const max = Math.max(...rows.map((r) => Math.abs(r.value))) || 1;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 sm:grid-cols-[220px_minmax(0,1fr)_140px]">
          <div className="min-w-0">
            <div className={clsx("truncate text-[14px]", r.kind === "result" || r.kind === "start" ? "font-semibold" : "text-slate-700")}>{r.label}</div>
            {r.note && <div className="truncate text-[12px] text-slate-500">{r.note}</div>}
          </div>
          <div className="order-3 col-span-2 h-2 overflow-hidden rounded-full bg-slate-100 sm:order-none sm:col-span-1">
            <motion.div
              className={clsx("h-full rounded-full", r.kind === "start" ? "bg-slate-900" : r.kind === "result" ? (r.value >= 0 ? "bg-emerald-500" : "bg-rose-500") : r.kind === "tax" ? "bg-slate-600" : "bg-slate-400")}
              initial={{ width: 0 }}
              whileInView={{ width: `${(Math.abs(r.value) / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: EASE }}
            />
          </div>
          <div className={clsx("text-right text-[15px] font-semibold tabular-nums", r.kind === "result" ? (r.value >= 0 ? "text-emerald-700" : "text-rose-600") : "")}>
            {r.kind === "start" ? `${Math.round(r.value).toLocaleString("da-DK")} kr.` : signed(r.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

function Checklist({ answers, year }: { answers: FlipAnswers; year: number | null }) {
  const items: { t: string; b: string; warn?: boolean }[] = [
    { t: "Læs tilstandsrapporten rigtigt", b: "Farverne siger, hvor alvorlig en skade er, ikke hvad den koster. Et tomt felt betyder, at det ikke er undersøgt, ikke at det er i orden. Få en byggesagkyndig til at prissætte de røde og sorte punkter." },
    { t: "Tjek BBR mod virkeligheden", b: "Er der udvidelser, kvist eller indrettet loft, som ikke står i BBR, kan de være ulovlige. Lovliggørelse koster, og køber kan få afslag i prisen.", warn: true },
    { t: "Lokalplan og byggetilladelse", b: "Vil du flytte vægge, lave tagterrasse eller ændre facaden, så tjek lokalplanen og om det kræver tilladelse, før du byder." },
    { t: "Servitutter i tingbogen", b: "Byggelinjer, vejret og deklarationer kan begrænse, hvad du må. Slå ejendommen op på tinglysning.dk." },
    { t: "Finansiering af renoveringen", b: "Få banken til at godkende renoveringsbudgettet og udbetalingen i rater, før du skriver under. Banker finansierer ikke altid alle faser." },
    { t: "Sammenlign tilbud på samme opgave", b: "Bed mindst tre håndværkere om pris på præcis det samme: nedrivning, bortskaffelse, materialer, tidsplan. Ellers kan tilbuddene ikke sammenlignes." },
    { t: "Forbehold i købsaftalen", b: "Skriv advokat- og finansieringsforbehold ind. Fortrydelsesretten på 6 hverdage koster 1 % af prisen og er ikke en plan." },
  ];
  if (year && year < 1977) items.splice(1, 0, { t: "Asbest og bly i ældre huse", b: `Huset er fra ${year}. Før 1977 kan der være asbest i gulve, tag og rør. Nedrivning kræver anmeldelse og koster ekstra.`, warn: true });
  if (answers.level !== "cosmetic") items.push({ t: "Vådrum og autoriseret arbejde", b: "Badeværelset skal vådrumssikres efter SBi-anvisning 252, og el og VVS skal laves af autoriserede. Gør du det selv uden autorisation, kan køber kræve afslag." });
  if (answers.strategy === "live_flip") items.push({ t: "Dokumentér at du bor der", b: "Flyt folkeregisteradresse, hav forbrug i dit navn og bo der reelt. Grunden skal være under 1.400 m², ellers gælder parcelhusreglen ikke fuldt.", warn: true });
  if (answers.sales === "3+" || answers.role === "pro_investor") items.push({ t: "Næring og selskabsform", b: "Med flere salg kan du blive anset som næringsdrivende. Tal med en revisor om selskabsform, før næste køb.", warn: true });
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {items.map((i) => (
        <li key={i.t} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <span className={clsx("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", i.warn ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700")}>
            {i.warn ? <ShieldAlert size={14} strokeWidth={2} /> : <Check size={14} strokeWidth={2.4} />}
          </span>
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold">{i.t}</span>
            <span className="mt-1 block text-[13px] leading-relaxed text-slate-600">{i.b}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

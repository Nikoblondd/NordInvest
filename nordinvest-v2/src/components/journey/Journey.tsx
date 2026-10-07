"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Hammer, Home, KeyRound, Link2, Loader2, Repeat, Users } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { DEFAULT_ANSWERS, type FlipAnswers } from "@/lib/flip/model";
import { captureEvent } from "@/lib/analytics-events";

/*
 * The start of every analysis: paste a link, see the home, say what you want
 * to do with it, answer a few questions that change the numbers, then land on
 * an analysis built for that plan. The listing is fetched while the user
 * chooses, so nothing waits on the network.
 */

type Listing = {
  url: string;
  address: string | null;
  zip: string | null;
  price: number | null;
  area: number | null;
  rooms: number | null;
  yearBuilt: number | null;
  monthlyExpenses: number | null;
  images: string[];
};

type Strategy = "cashflow" | "flip" | "live_flip";
type Q = { key: string; title: string; hint?: string; options: { value: string; label: string; sub?: string }[] };

const STORE = "ni_journey";
const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const EASE = [0.2, 0.7, 0.2, 1] as const;

function guessType(address: string | null): "villa" | "condo" | "terraced" {
  if (!address) return "villa";
  return /\b(st|kl|\d+)\.\s*(tv|th|mf|\d+)\b|\b\d+\.\s*sal\b/i.test(address) ? "condo" : "villa";
}

const STRATEGIES: { id: Strategy | "parents"; title: string; sub: string; icon: typeof Home; soon?: boolean }[] = [
  { id: "cashflow", title: "Udlejning", sub: "Køb og lej ud. Kan lejen betale lånet hver måned?", icon: KeyRound },
  { id: "flip", title: "Flip", sub: "Køb, renovér og sælg. Hvad tjener du efter skat?", icon: Hammer },
  { id: "live_flip", title: "Bo og flip", sub: "Bo i boligen mens du renoverer, og sælg skattefrit.", icon: Repeat },
  { id: "parents", title: "Forældrekøb", sub: "Lejlighed til et barn, der studerer.", icon: Users, soon: true },
];

function questions(s: Strategy, a: Record<string, string>): Q[] {
  if (s === "cashflow") {
    return [
      { key: "down", title: "Hvor stor udbetaling regner du med?", options: [
        { value: "20", label: "20 %", sub: "Realkredit 80 %" }, { value: "30", label: "30 %" }, { value: "50", label: "50 %" }, { value: "100", label: "Kontant" } ] },
      { key: "rate", title: "Hvilken rente skal vi regne med?", hint: "Du kan ændre den i analysen bagefter.", options: [
        { value: "4", label: "4 %" }, { value: "5", label: "5 %", sub: "Vores standard" }, { value: "6", label: "6 %", sub: "Forsigtigt" } ] },
    ];
  }
  const qs: Q[] = [
    { key: "type", title: "Hvilken type bolig er det?", options: [
      { value: "villa", label: "Villa" }, { value: "terraced", label: "Rækkehus" }, { value: "condo", label: "Ejerlejlighed" } ] },
    { key: "role", title: "Hvem er du?", hint: "Det ændrer, hvad håndværk og materialer koster dig.", options: [
      { value: "private", label: "Privat investor", sub: "Håndværkere udfører arbejdet" },
      { value: "tradesman", label: "Håndværker", sub: "Fagrabat på materialer" },
      { value: "contractor", label: "Entreprenør eller byggefirma", sub: "Eget sjak, køber el og VVS" },
      { value: "pro_investor", label: "Professionel investor", sub: "Flere projekter om året" } ] },
  ];
  if (a.role !== "contractor") {
    qs.push({ key: "diy", title: "Hvor meget laver du selv?", options: [
      { value: "none", label: "Intet", sub: "Alt går til håndværkere" },
      { value: "paint_floors", label: "Maling og gulve" },
      { value: "most", label: "Det meste", sub: "Ikke el og VVS, det kræver autorisation" },
      { value: "all", label: "Alt", sub: "Også el og VVS med autorisation" } ] });
  }
  qs.push(
    { key: "level", title: "Hvor meget skal boligen have?", options: [
      { value: "cosmetic", label: "En opfriskning", sub: "Maling, gulve og lister" },
      { value: "medium", label: "Køkken og bad", sub: "Plus døre, el-udtag og lamper" },
      { value: "total", label: "Totalrenovering", sub: "Plus el, varme, vand og vinduer" } ] },
    { key: "months", title: "Hvor længe ejer du den, fra køb til salg?", hint: "Hver måned koster renter, ejerudgift og forbrug.", options: [
      { value: "3", label: "3 måneder" }, { value: "6", label: "6 måneder" }, { value: "9", label: "9 måneder" }, { value: "12", label: "12 måneder" } ] },
    { key: "finance", title: "Hvordan betaler du købet?", options: [
      { value: "cash", label: "Kontant" }, { value: "loan20", label: "Lån med 20 % udbetaling" }, { value: "loan40", label: "Lån med 40 % udbetaling" } ] },
  );
  if (s === "flip") {
    qs.push({ key: "sales", title: "Hvor mange boliger har du solgt de sidste 5 år?", hint: "Sælger du mange, kan Skattestyrelsen se dig som næringsdrivende, og så beskattes gevinsten hårdere.", options: [
      { value: "0", label: "Ingen" }, { value: "1-2", label: "1 til 2" }, { value: "3+", label: "3 eller flere" } ] });
  }
  qs.push({ key: "target", title: "Hvor stor fortjeneste kræver du?", hint: "Vi bruger den til at regne dit maksimale bud ud.", options: [
    { value: "10", label: "10 %", sub: "af salgsprisen" }, { value: "15", label: "15 %", sub: "Typisk for flip" }, { value: "20", label: "20 %", sub: "Forsigtigt" } ] });
  return qs;
}

export function Journey() {
  const router = useRouter();
  const sp = useSearchParams();
  const [url, setUrl] = useState(sp.get("url") ?? "");
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [step, setStep] = useState<"link" | "strategy" | "questions" | "building">(sp.get("url") ? "strategy" : "link");
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [qi, setQi] = useState(0);

  const fetchListing = (u: string) => {
    setLoading(true);
    setErr(null);
    fetch(`/api/extract?url=${encodeURIComponent(u)}`)
      .then((r) => r.json())
      .then((d) => {
        const f = (d?.fields ?? {}) as Record<string, string | number>;
        const address = f.address ? String(f.address) : null;
        const l: Listing = {
          url: u,
          address,
          zip: address?.match(/\b(\d{4})\b/)?.[1] ?? null,
          price: Number(f.price) || null,
          area: Number(f.area) || null,
          rooms: Number(f.rooms) || null,
          yearBuilt: Number(f.yearBuilt) || null,
          monthlyExpenses: Number(f.monthlyExpenses) || null,
          images: Array.isArray(d?.images) ? d.images.slice(0, 12) : [],
        };
        setListing(l);
        setAnswers((a) => ({ type: guessType(address), ...a }));
        if (!d?.ok) setErr("Vi kunne ikke læse alle tal fra annoncen. Du kan rette dem i analysen.");
      })
      .catch(() => setErr("Vi kunne ikke hente annoncen. Du kan stadig fortsætte og indtaste tallene selv."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const u = sp.get("url");
    if (u) fetchListing(u);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const qs = useMemo(() => (strategy ? questions(strategy, answers) : []), [strategy, answers]);
  const q = qs[qi];
  const total = 2 + (qs.length || 8);
  const progress = step === "link" ? 0 : step === "strategy" ? 1 : step === "questions" ? 2 + qi : total;

  const submitLink = (e: React.FormEvent) => {
    e.preventDefault();
    const u = url.trim();
    if (!/^https?:\/\//i.test(u)) return setErr("Indsæt hele linket fra boligsiden, det starter med https://");
    captureEvent("journey_link", {});
    fetchListing(u);
    setStep("strategy");
  };

  const pickStrategy = (s: Strategy) => {
    captureEvent("journey_strategy", { strategy: s });
    setStrategy(s);
    setQi(0);
    setStep("questions");
  };

  const finish = (a: Record<string, string>) => {
    setStep("building");
    const l = listing;
    if (strategy === "cashflow") {
      const p = new URLSearchParams({ url: l?.url ?? url });
      if (l?.price) {
        p.set("price", String(l.price));
        if (l.area) p.set("area", String(l.area));
        if (l.rooms) p.set("rooms", String(l.rooms));
        if (l.monthlyExpenses) p.set("opex", String(l.monthlyExpenses));
        if (l.address) p.set("addr", l.address);
      }
      p.set("downPaymentPct", a.down ?? "20");
      p.set("interestRate", a.rate ?? "5");
      setTimeout(() => router.push(`/analyseren?${p.toString()}`), 900);
      return;
    }
    const fa: FlipAnswers = {
      ...DEFAULT_ANSWERS,
      strategy: strategy === "live_flip" ? "live_flip" : "flip",
      role: (a.role as FlipAnswers["role"]) ?? "private",
      diy: a.role === "contractor" ? "most" : ((a.diy as FlipAnswers["diy"]) ?? "none"),
      level: (a.level as FlipAnswers["level"]) ?? "medium",
      months: Number(a.months) || 6,
      finance: a.finance === "cash" ? "cash" : "loan",
      downPct: a.finance === "loan40" ? 40 : 20,
      sales: (a.sales as FlipAnswers["sales"]) ?? "0",
      target: Number(a.target) || 15,
    };
    try {
      sessionStorage.setItem(STORE, JSON.stringify({ listing: l, type: a.type ?? "villa", answers: fa }));
    } catch { /* the report refetches the listing */ }
    const p = new URLSearchParams({ url: l?.url ?? url, a: btoa(JSON.stringify({ ...fa, type: a.type ?? "villa" })) });
    setTimeout(() => router.push(`/analyseren/flip?${p.toString()}`), 1100);
  };

  const answer = (value: string) => {
    const next = { ...answers, [q.key]: value };
    setAnswers(next);
    const nextQs = questions(strategy!, next);
    if (qi + 1 >= nextQs.length) finish(next);
    else setTimeout(() => setQi(qi + 1), 160);
  };

  const back = () => {
    if (step === "questions" && qi > 0) setQi(qi - 1);
    else if (step === "questions") setStep("strategy");
    else if (step === "strategy") setStep("link");
  };

  return (
    <div className="mx-auto w-full max-w-[880px] px-4 pb-24 pt-8 sm:px-6 sm:pt-14">
      {/* progress */}
      <div className="flex items-center gap-3">
        {step !== "link" && step !== "building" && (
          <button type="button" onClick={back} aria-label="Tilbage" className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            <ArrowLeft size={18} strokeWidth={1.8} />
          </button>
        )}
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={progress}>
          <motion.div className="h-full rounded-full bg-blue-600" animate={{ width: `${Math.max(4, (progress / total) * 100)}%` }} transition={{ duration: 0.5, ease: EASE }} />
        </div>
        <span className="w-12 text-right text-xs tabular-nums text-slate-400">{Math.min(progress + 1, total)}/{total}</span>
      </div>

      {step !== "link" && <PropertyCard listing={listing} loading={loading} />}
      {err && <p className="mt-3 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-900">{err}</p>}

      <>
        {step === "link" && (
          <motion.form key="link" onSubmit={submitLink} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35, ease: EASE }} className="mt-14">
            <h1 className="text-[36px] font-semibold leading-[1.05] tracking-[-0.035em] [text-wrap:balance] sm:text-[52px]">Hvilken bolig kigger du på?</h1>
            <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-slate-600">Indsæt linket fra Boligsiden, EDC, home, Nybolig eller en anden mægler. Så viser vi dig, hvad den kan, alt efter hvad du vil med den.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <label className="relative flex-1">
                <span className="sr-only">Link til boligen</span>
                <Link2 aria-hidden size={18} strokeWidth={1.8} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" placeholder="https://www.boligsiden.dk/adresse/…" className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-base shadow-card outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
              </label>
              <button type="submit" className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-7 text-[15px] font-semibold text-white shadow-btn ring-1 ring-inset ring-white/10 transition-colors hover:bg-blue-700 active:translate-y-px">
                Fortsæt <ArrowRight size={16} />
              </button>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Intet link? <a href="/analyseren" className="font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900">Indtast tallene selv</a>
            </p>
          </motion.form>
        )}

        {step === "strategy" && (
          <motion.div key="strategy" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35, ease: EASE }} className="mt-10">
            <h1 className="text-[30px] font-semibold leading-[1.08] tracking-[-0.03em] [text-wrap:balance] sm:text-[42px]">Hvad vil du med boligen?</h1>
            <p className="mt-3 text-[16px] text-slate-600">Hver strategi stiller sine egne spørgsmål og får sin egen analyse.</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {STRATEGIES.map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.button
                    key={s.id}
                    type="button"
                    disabled={s.soon}
                    onClick={() => !s.soon && pickStrategy(s.id as Strategy)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.05 * i, ease: EASE }}
                    className={clsx(
                      "group relative flex min-h-[132px] flex-col items-start rounded-2xl border bg-white p-5 text-left shadow-card transition-[transform,border-color,box-shadow]",
                      s.soon ? "cursor-default border-slate-100 opacity-60" : "border-slate-200 hover:-translate-y-[1px] hover:border-blue-300 hover:shadow-card-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                    )}
                  >
                    <span className={clsx("flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset", s.soon ? "bg-slate-50 text-slate-400 ring-slate-200" : "bg-blue-50 text-blue-700 ring-blue-100")}>
                      <Icon size={19} strokeWidth={1.8} />
                    </span>
                    <span className="mt-4 flex items-center gap-2 text-[18px] font-semibold tracking-[-0.01em] text-slate-900">
                      {s.title}
                      {s.soon && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">Kommer snart</span>}
                    </span>
                    <span className="mt-1 text-[14px] leading-snug text-slate-600">{s.sub}</span>
                    {!s.soon && <ArrowRight aria-hidden size={16} className="absolute right-5 top-5 text-slate-300 transition-colors group-hover:text-blue-600" />}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {step === "questions" && q && (
          <motion.div key={`q-${q.key}`} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3, ease: EASE }} className="mt-10">
            <p className="text-sm font-medium text-blue-700">Spørgsmål {qi + 1} af {qs.length}</p>
            <h1 className="mt-2 text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] [text-wrap:balance] sm:text-[38px]">{q.title}</h1>
            {q.hint && <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate-600">{q.hint}</p>}
            <div className="mt-7 grid gap-2.5">
              {q.options.map((o) => {
                const on = answers[q.key] === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => answer(o.value)}
                    className={clsx(
                      "flex min-h-[60px] items-center justify-between gap-4 rounded-2xl border px-5 py-3.5 text-left transition-[border-color,background-color,transform] active:translate-y-px",
                      on ? "border-blue-500 bg-blue-50/60" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block text-[16px] font-semibold text-slate-900">{o.label}</span>
                      {o.sub && <span className="block text-[13px] text-slate-500">{o.sub}</span>}
                    </span>
                    <span className={clsx("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border", on ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300")}>
                      {on && <Check size={14} strokeWidth={2.4} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {step === "building" && (
          <motion.div key="building" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-16 flex flex-col items-center text-center">
            <Loader2 className="animate-spin text-blue-600" size={28} />
            <p className="mt-5 text-[20px] font-semibold tracking-[-0.02em]">Bygger din analyse</p>
            <p className="mt-2 text-[15px] text-slate-500">
              {strategy === "cashflow" ? "Regner leje, lån og udgifter igennem" : "Henter boligpriser i postnummeret og priser på materialer"}
            </p>
          </motion.div>
        )}
      </>
    </div>
  );
}

function PropertyCard({ listing, loading }: { listing: Listing | null; loading: boolean }) {
  if (loading && !listing) {
    return (
      <div className="mt-6 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-card">
        <div className="h-16 w-24 shrink-0 animate-pulse rounded-xl bg-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    );
  }
  if (!listing) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-card">
      {listing.images[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={listing.images[0]} alt="" className="h-16 w-24 shrink-0 rounded-xl object-cover" />
      ) : (
        <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-300"><Home size={20} /></div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold text-slate-900">{listing.address ?? "Boligen fra dit link"}</div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 text-[13px] tabular-nums text-slate-500">
          {listing.price && <span className="font-medium text-slate-700">{kr(listing.price)}</span>}
          {listing.area && <span>{listing.area} m²</span>}
          {listing.rooms && <span>{listing.rooms} vær.</span>}
          {listing.yearBuilt && <span>Opført {listing.yearBuilt}</span>}
        </div>
      </div>
    </motion.div>
  );
}

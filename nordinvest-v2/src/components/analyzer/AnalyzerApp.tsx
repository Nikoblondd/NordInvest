"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader2, CheckCircle2, AlertCircle, FileSpreadsheet, ChevronDown, HelpCircle, X, Bookmark, Check, FileText, Bell, BellRing } from "lucide-react";
import { analyze, kr, krMd, pct, num, type Strategy } from "@/lib/analysis";
import { runUncertainty } from "@/lib/uncertainty";
import { assessInvestment } from "@/lib/deals";
import { ConfidenceBands } from "@/components/analyzer/ConfidenceBands";
import { clsx } from "@/lib/clsx";
import { loadSupabase } from "@/lib/supabase/lazy";
import { type ConfidenceTier } from "@/lib/calibration";
import { regionFromAddress, regionLabel } from "@/lib/region";
import { PrecisionFeedback } from "@/components/analyzer/PrecisionFeedback";
import { BrainBadge } from "@/components/analyzer/BrainBadge";
import { OutcomeForm } from "@/components/analyzer/OutcomeForm";
import { BbrPanel, type BbrEnrich } from "@/components/analyzer/BbrPanel";
import { RenovationModule, type RenovationSnapshot } from "@/components/analyzer/RenovationModule";
import { AnalystChat } from "@/components/analyzer/AnalystChat";
import { DataProvenance } from "@/components/analyzer/DataProvenance";
import { MarketBenchmark } from "@/components/analyzer/MarketBenchmark";
import { RentBenchmark } from "@/components/analyzer/RentBenchmark";
import { RentReserve } from "@/components/analyzer/RentReserve";
import { FutureBurdens } from "@/components/analyzer/FutureBurdens";
import { Comparables } from "@/components/analyzer/Comparables";
import { ExpenseCheck } from "@/components/analyzer/ExpenseCheck";
import { DealHero, type HeroMetric } from "@/components/analyzer/story/DealHero";
import { MoneyFlow } from "@/components/analyzer/story/MoneyFlow";
import { Chapter, ChapterNav, Details, Panel, type ChapterAnswer, type NavItem } from "@/components/analyzer/story/Chapter";
import { RateStress } from "@/components/analyzer/story/RateStress";
import type { Tone } from "@/components/analyzer/story/tone";
import type { RentBenchmark as RentBench } from "@/lib/rent";
import { computeRentReserve } from "@/lib/rent-reserve";
import { PaywallGate } from "@/components/analyzer/PaywallGate";
import { NumberInput } from "@/components/ui/NumberInput";
import { SignupGate } from "@/components/analyzer/SignupGate";
import { UpgradeDialog, type UpgradeReason } from "@/components/upgrade/UpgradeDialog";
import { UsageNudge } from "@/components/upgrade/UsageNudge";
import { ShareAnalysis } from "@/components/analyzer/ShareAnalysis";
import { ANON_FREE, countAnonAnalysis, fetchPlan, usePlan } from "@/lib/plan";
import { TimeSavingsCapture } from "@/components/analyzer/TimeSavingsCapture";
import { captureEvent } from "@/lib/analytics-events";
import { buildProvenance, rentRegulationRule } from "@/lib/provenance";
import type { PriceBenchmark } from "@/lib/reference";

// The hero and the cash-flow waterfall open the result, so they're part of the
// bundle: loading them late pushed the whole result down as they arrived (CLS).
// The adjust sheet (closed until asked for) and the 10-year projection (far
// down the page) load in their own chunks, warmed on idle.
const loadSheet = () => import("@/components/analyzer/story/Sheet");
const loadProjection = () => import("@/components/analyzer/story/ProjectionStory");
const Sheet = dynamic(() => loadSheet().then((m) => m.Sheet), { ssr: false });
const ProjectionStory = dynamic(() => loadProjection().then((m) => m.ProjectionStory));
function warmResultView() {
  const run = () => void Promise.all([loadSheet(), loadProjection()]).catch(() => {});
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 3000 });
  else window.setTimeout(run, 1500);
}

type CalState = {
  count: number;
  rentFactor: number;
  observedAppreciationPct: number | null;
  confidence: number;
  avgRating: number | null;
  feedbackCount: number;
  region: string | null;
  regionCount: number;
  globalCount: number;
  tier: ConfidenceTier;
};
const NEUTRAL_CAL: CalState = {
  count: 0, rentFactor: 1, observedAppreciationPct: null, confidence: 0, avgRating: null,
  feedbackCount: 0, region: null, regionCount: 0, globalCount: 0, tier: "none",
};

type Inputs = {
  price: number; monthlyRent: number; downPaymentPct: number; interestRate: number;
  termYears: number; monthlyOpex: number; vacancyPct: number; maintenancePct: number;
  acqCostPct: number; appreciationPct: number; rentGrowthPct: number; holdYears: number;
  strategy: Strategy;
};

const DEFAULTS: Inputs = {
  price: 4_300_000, monthlyRent: 21_500, downPaymentPct: 20, interestRate: 5.0,
  termYears: 30, monthlyOpex: 3_800, vacancyPct: 4, maintenancePct: 8,
  acqCostPct: 1.5, appreciationPct: 3, rentGrowthPct: 2, holdYears: 10, strategy: "cashflow",
};

const INPUT_KEYS: (keyof Inputs)[] = [
  "price", "monthlyRent", "downPaymentPct", "interestRate", "termYears", "monthlyOpex",
  "vacancyPct", "maintenancePct", "acqCostPct", "appreciationPct", "rentGrowthPct", "holdYears", "strategy",
];

function pickInputs(src: Record<string, unknown> | null | undefined): Partial<Inputs> {
  const out: Partial<Inputs> = {};
  if (!src) return out;
  for (const k of INPUT_KEYS) {
    const v = src[k];
    if (v === undefined || v === null) continue;
    if (k === "strategy") out.strategy = v as Strategy;
    else if (typeof v === "number" && !Number.isNaN(v)) (out as Record<string, number>)[k] = v;
    else if (typeof v === "string" && v !== "" && !Number.isNaN(Number(v))) (out as Record<string, number>)[k] = Number(v);
  }
  return out;
}

const strategies: { id: Strategy; label: string }[] = [
  { id: "cashflow", label: "Cashflow" },
  { id: "appreciation", label: "Værdistigning" },
  { id: "value_add", label: "Value-add" },
];

const FIELD_LABELS: Record<string, string> = {
  price: "pris", area: "m²", rooms: "værelser", yearBuilt: "byggeår", energyLabel: "energimærke",
  monthlyExpenses: "ejerudgift", annualRent: "lejeindtægt", monthlyRent: "leje", yieldPct: "afkast", address: "adresse",
};

type Extract = { status: "idle" | "loading" | "ok" | "fail"; stage?: string; msg?: string; found?: string[]; estimated?: string[] };

function Field({ label, name, value, onChange, suffix, step = 1 }: {
  label: string; name: string; value: number; onChange: (n: number) => void; suffix: string; step?: number;
}) {
  return (
    <label className="block min-w-0">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <div className="mt-1.5 flex items-center rounded-xl border border-slate-200 bg-white transition-colors focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20 hover:border-slate-300">
        <NumberInput
          name={name}
          value={value}
          decimals={suffix.includes("%") || step < 1 ? 2 : 0}
          onValueChange={(n) => onChange(n ?? 0)}
          className="w-full min-w-0 rounded-xl bg-transparent px-3.5 py-3 text-[17px] font-medium tabular-nums text-slate-900 outline-none"
        />
        <span className="shrink-0 whitespace-nowrap pr-3.5 text-sm text-slate-400">{suffix}</span>
      </div>
    </label>
  );
}

// One figure in the "alle nøgletal" grid: label, number, one line of context.
// No box and no icon badge; a hairline on top groups it. The "?" opens a plain
// explanation of what the number means and how it is calculated.
function KeyStat({
  label, value, unit = "", tone = "text-slate-900", explain, how, sub,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: string;
  explain?: string;
  how?: string;
  /** Optional one-liner under the number ("+1.240 kr vs. medianen"). */
  sub?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div ref={ref} className="relative min-w-0 border-t border-slate-200 pt-4">
      <div className="flex min-w-0 items-start gap-1.5 text-sm font-medium leading-snug text-slate-500">
        <span className="min-w-0">{label}</span>
        {explain && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={`Hvad betyder ${label}?`}
            aria-expanded={open}
            className="relative -m-1 shrink-0 rounded-full p-1 text-slate-400 transition-colors after:absolute after:-inset-[11px] after:content-[''] hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <HelpCircle aria-hidden size={14} strokeWidth={2} />
          </button>
        )}
      </div>
      <div className={clsx("mt-1.5 flex items-baseline gap-1 whitespace-nowrap", tone)}>
        <span className="text-[26px] font-semibold leading-tight tabular-nums tracking-[-0.025em] sm:text-[30px]">{value}</span>
        {unit && <span className="text-[15px] font-medium text-slate-400">{unit}</span>}
      </div>
      {sub && <div className="mt-1 text-sm leading-snug text-slate-500">{sub}</div>}

      {open && explain && (
        <div role="dialog" aria-label={label} className="absolute left-0 top-full z-30 mt-2 w-72 max-w-[85vw] rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-[0_18px_40px_-12px_rgba(15,23,42,0.25)]">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[15px] font-semibold text-slate-900">{label}</div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Luk forklaring" className="-m-1 rounded-full p-1 text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
              <X aria-hidden size={16} />
            </button>
          </div>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{explain}</p>
          {how && (
            <p className="mt-3 border-t border-slate-100 pt-3 text-sm leading-relaxed text-slate-500">
              <span className="font-semibold text-slate-700">Sådan regnes det: </span>{how}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Friendly name for the portal a listing was scraped from, from its URL host.
function sourceName(url: string | null): string {
  if (!url) return "annoncen";
  let host = "";
  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { return "annoncen"; }
  const map: Record<string, string> = {
    "ejendomstorvet.dk": "Ejendomstorvet",
    "boligsiden.dk": "Boligsiden",
    "edc.dk": "EDC",
    "home.dk": "home",
    "nybolig.dk": "Nybolig",
    "danbolig.dk": "Danbolig",
    "estate.dk": "Estate",
    "lokalbolig.dk": "Lokalbolig",
    "realmaeglerne.dk": "Realmæglerne",
    "brikk.dk": "Brikk",
    "nordicals.dk": "Nordicals",
  };
  return map[host] ?? host;
}

export function AnalyzerApp() {
  useEffect(() => warmResultView(), []);
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [address, setAddress] = useState<string | null>(null);
  const [ran, setRan] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [save, setSave] = useState<{ status: "idle" | "saving" | "saved" | "limit" | "error"; msg?: string }>({ status: "idle" });
  const [watch, setWatch] = useState<{ status: "idle" | "saving" | "saved" | "error"; msg?: string }>({ status: "idle" });
  const [listingUrl, setListingUrl] = useState<string | null>(null);
  const [ex, setEx] = useState<Extract>({ status: "idle" });
  const [cal, setCal] = useState<CalState>(NEUTRAL_CAL);
  const calRef = useRef(cal);
  useEffect(() => { calRef.current = cal; }, [cal]);
  const set = (patch: Partial<Inputs>) => setInputs((p) => ({ ...p, ...patch }));
  // Usage tracking: every analysis run is logged once (per distinct property in
  // this session) so the dashboard counts real usage. The logged row's id lets
  // "Gem til portefølje" flip THAT row to saved instead of inserting a second
  // one (no double-count).
  const usageRowIdRef = useRef<string | null>(null);
  const loggedSigRef = useRef<string | null>(null);
  const mountedAtRef = useRef<number>(Date.now());
  // Time-savings micro-survey visibility (once per analysis, dismissible).
  const [tsHidden, setTsHidden] = useState(false);
  const [analysisLogged, setAnalysisLogged] = useState(false);
  // Upgrade path: the signup gate (3rd analysis without an account), this
  // month's usage for the nudge, and the dialog for paid-only actions.
  const plan = usePlan();
  const [signupGated, setSignupGated] = useState(false);
  const [usage, setUsage] = useState<{ authenticated: boolean; used: number; max: number; unlimited: boolean } | null>(null);
  const [upgrade, setUpgrade] = useState<UpgradeReason | null>(null);
  const requirePaid = (reason: UpgradeReason, action: () => void) => {
    fetchPlan().then((p) => (p.paid ? action() : setUpgrade(reason)));
  };

  const [bbr, setBbr] = useState<BbrEnrich | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [rentEstimated, setRentEstimated] = useState(false);
  const [renoSnap, setRenoSnap] = useState<RenovationSnapshot | null>(null);
  // Unit-level facts read straight from the listing. These are authoritative for
  // THIS apartment (area, rooms); BBR's enhed can be a representative unit and
  // its boligareal is the whole building — so the listing wins for the unit.
  const [propMeta, setPropMeta] = useState<{ area: number | null; rooms: number | null }>({ area: null, rooms: null });
  const [priceBench, setPriceBench] = useState<PriceBenchmark | null>(null);
  const [rentBench, setRentBench] = useState<RentBench | null>(null);
  const [gated, setGated] = useState(false);
  const [freeMax, setFreeMax] = useState(3);
  const region = useMemo(() => regionFromAddress(address), [address]);
  // Postnummer parsed from the address — keys the documented market benchmark.
  const zip = useMemo(() => {
    const m = (address ?? "").match(/\b(\d{4})\b/);
    return m ? Number(m[1]) : null;
  }, [address]);

  // Enrich with official BBR building data once we have an address.
  useEffect(() => {
    if (!address) { setBbr(null); return; }
    let cancelled = false;
    fetch(`/api/property/enrich?adresse=${encodeURIComponent(address)}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setBbr(d?.enriched ? d : null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [address]);

  // Load the model calibration (the "brain") for this property's region —
  // refetches when the region changes so the badge/factors stay local.
  useEffect(() => {
    const q = region ? `?region=${encodeURIComponent(region)}` : "";
    fetch(`/api/calibration${q}`).then((r) => r.json()).then(setCal).catch(() => {});
  }, [region]);

  const searchParams = useSearchParams();
  const urlParam = searchParams.get("url");
  const savedParam = searchParams.get("saved");
  const priceParam = searchParams.get("price");
  const dealSeededRef = useRef(false);

  // Seed from the deal engine's reliable Boligsiden numbers (price, area, rooms,
  // ejerudgift, estimated rent). The listing URL is still used below to fetch
  // photos for the AI condition analysis — but the core figures come from here,
  // not from re-scraping each agent's page.
  useEffect(() => {
    if (!priceParam) return;
    const price = Number(priceParam);
    if (!Number.isFinite(price) || price <= 0) return;
    dealSeededRef.current = true;
    const area = Number(searchParams.get("area")) || null;
    const rooms = Number(searchParams.get("rooms")) || null;
    const opex = Number(searchParams.get("opex"));
    const rent = Number(searchParams.get("rent"));
    const addr = searchParams.get("addr");
    const investment = searchParams.get("market") === "investering";
    // Financing assumptions the deal card was scored with — carry them through so
    // the full analysis reproduces the SAME cash flow and score (no jump).
    const dp = Number(searchParams.get("downPaymentPct"));
    const ir = Number(searchParams.get("interestRate"));
    setInputs((prev) => ({
      ...prev,
      price,
      ...(Number.isFinite(rent) && rent > 0 ? { monthlyRent: rent } : {}),
      // Down payment: use the card's value; otherwise default 30 % for an
      // investment property, 20 % for a home (mirrors the deal engine).
      downPaymentPct: Number.isFinite(dp) && dp > 0 ? dp : investment ? 30 : 20,
      ...(Number.isFinite(ir) && ir > 0 ? { interestRate: ir } : {}),
      // For an investment property the passed rent IS the net NOI/12, so zero out
      // the operating buffers — otherwise the analyzer would eat into it a second
      // time and understate the yield the deal card showed.
      ...(investment
        ? { monthlyOpex: 0, vacancyPct: 0, maintenancePct: 0 }
        : Number.isFinite(opex) && opex >= 0
        ? { monthlyOpex: opex }
        : {}),
    }));
    setPropMeta({ area, rooms });
    if (addr) setAddress(addr);
    if (Number.isFinite(rent) && rent > 0) setRentEstimated(true);
    setRan(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceParam]);

  // Restore a saved analysis from the portfolio (deterministic re-run from stored inputs).
  useEffect(() => {
    if (!savedParam) return;
    let cancelled = false;
    (async () => {
      const supabase = await loadSupabase();
      if (!supabase) return;
      const { data } = await supabase
        .from("analyses")
        .select("property_data")
        .eq("id", savedParam)
        .single();
      if (cancelled || !data) return;
      const pd = (data.property_data ?? {}) as Record<string, unknown>;
      setInputs((prev) => ({ ...prev, ...pickInputs(pd) }));
      if (typeof pd.address === "string") setAddress(pd.address);
      setRan(true);
      setEx({ status: "idle" });
    })();
    return () => { cancelled = true; };
  }, [savedParam]);

  useEffect(() => {
    const url = urlParam;
    if (!url) return;
    setListingUrl(url);
    setRan(true);
    let cancelled = false;
    const run = async () => {
      const stages = ["Henter annoncen…", "Læser nøgletal (pris, m², leje, udgifter)…", "Beregner afkast og risiko…"];
      setEx({ status: "loading", stage: stages[0] });
      const started = Date.now();
      const p = fetch(`/api/extract?url=${encodeURIComponent(url)}`).then((r) => r.json()).catch(() => ({ ok: false }));
      // staged messages for a thorough feel
      setTimeout(() => !cancelled && setEx((s) => (s.status === "loading" ? { ...s, stage: stages[1] } : s)), 900);
      setTimeout(() => !cancelled && setEx((s) => (s.status === "loading" ? { ...s, stage: stages[2] } : s)), 1900);
      const d = await p;
      const elapsed = Date.now() - started;
      if (elapsed < 2600) await new Promise((r) => setTimeout(r, 2600 - elapsed));
      if (cancelled) return;

      if (Array.isArray(d.images)) setImages(d.images as string[]);
      // Seeded from a deal: keep the aggregator's reliable core numbers, but pull
      // the listing's own ejerudgift (and stated rent, if any) from the mægler
      // page so those figures become DOCUMENTED instead of estimated. The deal
      // card scored on an area-based opex estimate; the real ejerudgift is more
      // accurate, so we upgrade to it and mark it Dokumenteret in Datagrundlag.
      if (dealSeededRef.current) {
        const estimated: string[] = ["leje"];
        const foundKeys: string[] = [];
        const investmentSeed = searchParams.get("market") === "investering";
        if (!investmentSeed && d.ok && d.fields) {
          const fld = d.fields as Record<string, number | string>;
          const patch: Partial<Inputs> = {};
          const opex = Number(fld.monthlyExpenses);
          if (Number.isFinite(opex) && opex > 100 && opex < 60000) {
            patch.monthlyOpex = opex;
            foundKeys.push("monthlyExpenses");
          }
          const rent = Number(fld.monthlyRent);
          if (Number.isFinite(rent) && rent > 1000 && rent < 60000) {
            patch.monthlyRent = rent;
            foundKeys.push("monthlyRent");
            setRentEstimated(false);
            const i = estimated.indexOf("leje");
            if (i >= 0) estimated.splice(i, 1);
          }
          if (Object.keys(patch).length) setInputs((prev) => ({ ...prev, ...patch }));
        }
        if (!investmentSeed && !foundKeys.includes("monthlyExpenses")) estimated.push("faste udgifter");
        setEx({ status: "ok", found: foundKeys, estimated });
        return;
      }
      if (d.ok && d.fields) {
        const fld = d.fields as Record<string, number | string>;
        const patch: Partial<Inputs> = {};
        const estimated: string[] = [];
        if (fld.price) patch.price = Number(fld.price);
        if (fld.monthlyRent) patch.monthlyRent = Number(fld.monthlyRent);
        else if (fld.area) { patch.monthlyRent = Math.round((Number(fld.area) * 110 * calRef.current.rentFactor) / 100) * 100; estimated.push("leje"); }
        if (fld.monthlyExpenses) patch.monthlyOpex = Number(fld.monthlyExpenses);
        else if (fld.area) { patch.monthlyOpex = Math.round((Number(fld.area) * 35) / 50) * 50; estimated.push("faste udgifter"); }
        if (fld.address) setAddress(String(fld.address));
        setPropMeta({
          area: fld.area ? Number(fld.area) : null,
          rooms: fld.rooms ? Number(fld.rooms) : null,
        });
        setInputs((prev) => ({ ...prev, ...patch }));
        setRentEstimated(estimated.includes("leje"));
        setEx({ status: "ok", found: (d.found as string[]) ?? [], estimated });
      } else {
        const err = String(d.error ?? "");
        const msg =
          err === "boligsiden_not_active"
            ? "Denne bolig er ikke længere aktiv på Boligsiden. Indtast tallene selv under “Justér tallene”. Analysen bliver lige så præcis."
            : err === "invalid_url"
            ? "Linket ser ikke rigtigt ud. Kopier hele URL'en fra boligsiden og prøv igen."
            : err.startsWith("fetch_")
            ? "Siden blokerede vores hentning. Indtast tallene selv under “Justér tallene”. Analysen bliver lige så præcis."
            : "Kunne ikke hente data automatisk fra dette link. Indtast tallene selv under “Justér tallene”. Analysen bliver lige så præcis.";
        setEx({ status: "fail", msg });
      }
    };
    run();
    return () => { cancelled = true; };
  }, [urlParam]);

  const r = useMemo(() => analyze(inputs), [inputs]);
  // Fase 3 — Monte Carlo confidence bands. Recomputes only when inputs or the
  // region's data-confidence change (2000 runs is a few ms, but memoise anyway).
  const uncertainty = useMemo(
    () => runUncertainty(inputs, { confidence: cal.confidence, rentEstimated }),
    [inputs, cal.confidence, rentEstimated],
  );
  // Commercial/investment properties (opened from the Deal-motor) are judged with
  // the asset-class-aware model — the SAME one the deal cards use — so the score,
  // rating, verdict and risk note are consistent everywhere, not the residential
  // formula applied to a commercial deal.
  const isInvestment = searchParams.get("market") === "investering";
  const subcatParam = searchParams.get("subcat");
  const inv = useMemo(
    () => (isInvestment ? assessInvestment(r.capRate, r.dscr, r.cashOnCash, subcatParam) : null),
    [isInvestment, subcatParam, r.capRate, r.dscr, r.cashOnCash],
  );
  const displayScore = inv ? inv.score : r.score;
  const displayRating = inv ? inv.rating : r.rating;
  const displayVerdict = inv ? inv.verdict : r.verdict;
  const scoreColor = displayScore >= 65 ? "text-emerald-600" : displayScore >= 45 ? "text-blue-600" : "text-rose-500";

  // Log each distinct analysis once (best-effort; anonymous users are a no-op on
  // the server). Restored saved analyses are already counted, so skip them.
  useEffect(() => {
    if (!ran || savedParam) return;
    if (!Number.isFinite(inputs.price) || inputs.price <= 0) return;
    const sig = `${address ?? ""}|${inputs.price}|${isInvestment ? "inv" : "bolig"}`;
    if (loggedSigRef.current === sig) return;
    loggedSigRef.current = sig;
    usageRowIdRef.current = null;
    setTsHidden(false); // fresh property → offer the time-savings survey again
    setAnalysisLogged(false);
    (async () => {
      try {
        const res = await fetch("/api/usage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address,
            price: inputs.price,
            score: displayScore,
            verdict: displayVerdict,
            strategy: inputs.strategy,
            propertyData: { ...inputs, address },
          }),
        });
        const d = await res.json();
        if (d?.ok && d.id) { usageRowIdRef.current = d.id as string; setAnalysisLogged(true); }
        if (d?.authenticated === false) {
          // No account: three analyses free, the fourth asks for a free account.
          const n = countAnonAnalysis(sig);
          setUsage({ authenticated: false, used: n, max: ANON_FREE, unlimited: false });
          if (n > ANON_FREE) setSignupGated(true);
          else captureEvent("analysis_completed", { market: isInvestment ? "investering" : "bolig", anon: true });
          return;
        }
        if (d?.ok) setUsage({ authenticated: true, used: Number(d.used) || 0, max: Number(d.max) || 0, unlimited: !!d.unlimited });
        // Gate the results when a signed-in free user is past their monthly
        // quota — the willingness-to-pay moment. Anonymous users (authenticated
        // false) and admins/paid within limit are never gated.
        if (d?.authenticated !== false) {
          const over = !!d?.over;
          setGated(over);
          if (Number.isFinite(d?.max)) setFreeMax(Number(d.max));
          captureEvent(over ? "paywall_shown" : "analysis_completed", { market: isInvestment ? "investering" : "bolig" });
        }
      } catch {
        /* usage logging is best-effort */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ran, address, inputs.price, isInvestment, savedParam]);
  const cfTone = r.cashFlow >= 0 ? "text-emerald-600" : "text-rose-500";
  const dscrTone = r.dscr >= 1.2 ? "text-emerald-600" : r.dscr >= 1 ? "text-blue-600" : "text-rose-500";
  const dk = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString("da-DK") : "–");

  // Datagrundlag — honest per-figure provenance + rent-regulation caveat. The
  // validation review flagged "tillid til tallene" as the #1 product risk, so we
  // label every verdict-driving figure and never let an estimate look documented.
  const byggeaar = bbr?.bbr?.byggeaar ?? null;
  const area = propMeta.area ?? bbr?.bbr?.enhedsareal_m2 ?? null;
  const hasArea = !!area;
  const propertyPriceM2 = area && area > 0 ? inputs.price / area : null;

  // Documented market price/m² benchmark for this property's postnummer (from our
  // own scraped market). Residential only — commercial deals use their own data.
  useEffect(() => {
    if (isInvestment || !zip) { setPriceBench(null); return; }
    let cancelled = false;
    fetch(`/api/reference?zip=${zip}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setPriceBench(d?.benchmark ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [zip, isInvestment]);

  // Documented rent benchmark — DST HUS1-anchored + user observations overlay.
  // Residential only; commercial rent is baked into the NOI on those deals.
  const propType = searchParams.get("subcat") || "condo";
  // Effect uses `propMeta.area ?? bbr enhed` directly (the `area` const is
  // declared further down, so we can't reference it here — TDZ).
  const rentBenchArea = propMeta.area ?? bbr?.bbr?.enhedsareal_m2 ?? null;
  useEffect(() => {
    if (isInvestment || !zip) { setRentBench(null); return; }
    let cancelled = false;
    const q = new URLSearchParams({ zip: String(zip), type: propType });
    if (rentBenchArea) q.set("area", String(rentBenchArea));
    fetch(`/api/rent-benchmark?${q}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setRentBench(d?.benchmark ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [zip, isInvestment, propType, rentBenchArea]);

  const provenanceRows = useMemo(
    () =>
      buildProvenance({
        fromDeal: !!priceParam,
        fromListing: !!listingUrl && !priceParam,
        found: ex.found ?? [],
        rentEstimated,
        opexEstimated: (ex.estimated ?? []).includes("faste udgifter"),
        isInvestment,
        hasArea,
        byggeaar,
        priceBenchmark: priceBench
          ? { n: priceBench.n, regionLabel: priceBench.regionLabel, asOf: priceBench.asOf }
          : null,
        rentBenchmark: rentBench
          ? { tier: rentBench.tier, regionLabel: rentBench.regionLabel, source: rentBench.source }
          : null,
      }),
    [priceParam, listingUrl, ex.found, ex.estimated, rentEstimated, isInvestment, hasArea, byggeaar, priceBench, rentBench],
  );
  const rentRule = useMemo(() => rentRegulationRule(byggeaar), [byggeaar]);

  // Lejereserve — residential rental cases with a market rent + real area.
  const rentReserve = useMemo(() => {
    if (isInvestment || !rentBench || !area || area <= 10) return null;
    return computeRentReserve({
      currentMonthlyRent: inputs.monthlyRent,
      marketRentPerM2Month: rentBench.value,
      areaM2: area,
      yearBuilt: byggeaar,
      zip,
      regionalCapRate: 5.0,
      propertyType: propType,
    });
  }, [isInvestment, rentBench, area, inputs.monthlyRent, byggeaar, zip, propType]);

  /* ---------- The story: one answer per question ---------- */
  const p1 = (n: number) => n.toLocaleString("da-DK", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const heroTone: Tone = displayScore >= 65 ? "good" : displayScore >= 45 ? "warn" : "bad";
  const heroHeadline =
    displayScore >= 80 ? "Stærk handel." : displayScore >= 65 ? "God handel." : displayScore >= 45 ? "Tvivlsom handel." : "Svag handel.";
  const heroNotes = [
    ...(inv?.note ? [inv.note.replace(" — ", ". ")] : []),
    ...(!isInvestment && rentEstimated ? ["Bygger på en estimeret leje. Bekræft den, før du handler."] : []),
  ];
  const heroMetrics: HeroMetric[] = [
    {
      label: "Cash flow pr. md.",
      value: `${r.cashFlow >= 0 ? "+" : "−"}${dk(Math.abs(r.cashFlow))}`,
      unit: "kr",
      tone: r.cashFlow >= 500 ? "good" : r.cashFlow >= 0 ? "warn" : "bad",
    },
    { label: "Nettoafkast", value: num(r.capRate), unit: "%", tone: r.capRate >= 5 ? "good" : r.capRate >= 3.5 ? "warn" : "bad" },
    { label: "Kontantafkast", value: num(r.cashOnCash), unit: "%", tone: r.cashOnCash >= 8 ? "good" : r.cashOnCash >= 0 ? "warn" : "bad" },
    { label: "Gældsdækning", value: num(r.dscr), tone: r.dscr >= 1.25 ? "good" : r.dscr >= 1 ? "warn" : "bad" },
  ];

  const cashAnswer: ChapterAnswer =
    r.cashFlow >= 0
      ? { tone: r.cashFlow >= 500 ? "good" : "warn", text: `Ja, ${dk(r.cashFlow)} kr i overskud hver måned` }
      : { tone: "bad", text: `Nej, du lægger ${dk(Math.abs(r.cashFlow))} kr til hver måned` };

  const priceDelta = priceBench && propertyPriceM2 ? ((propertyPriceM2 - priceBench.value) / priceBench.value) * 100 : null;
  const showPriceChapter = !isInvestment && (!!priceBench || !!rentBench || (!!zip && !!area && area > 10));
  const priceAnswer: ChapterAnswer =
    priceDelta == null
      ? { tone: "neutral", text: "Se hvad lignende boliger koster" }
      : priceDelta <= -3
      ? { tone: "good", text: `Ja, ${Math.round(Math.abs(priceDelta))} % under markedet pr. m²` }
      : priceDelta <= 3
      ? { tone: "good", text: "Ja, på niveau med markedet pr. m²" }
      : priceDelta <= 15
      ? { tone: "warn", text: `Lidt dyr: ${Math.round(priceDelta)} % over markedet pr. m²` }
      : { tone: "bad", text: `Nej, ${Math.round(priceDelta)} % over markedet pr. m²` };

  const headroom = Number.isFinite(r.breakEvenRate) ? r.breakEvenRate - inputs.interestRate : 0;
  const riskAnswer: ChapterAnswer =
    headroom >= 2
      ? { tone: "good", text: `Robust. Tåler ${p1(headroom)} %-point højere rente` }
      : headroom >= 0
      ? { tone: "warn", text: `Sårbar. Kun ${p1(headroom)} %-point rentebuffer` }
      : { tone: "bad", text: "Taber allerede penge ved din rente" };

  const potentialAnswer: ChapterAnswer =
    rentReserve?.verdict === "reserve"
      ? { tone: "good", text: `Ja, +${dk(rentReserve.realisticMonthlyUplift)} kr/md. i lejereserve` }
      : rentReserve?.verdict === "over-market"
      ? { tone: "warn", text: "Lejen ligger over markedet. Risiko ved genudlejning" }
      : { tone: "neutral", text: "Regn på istandsættelse og værdiskabelse" };

  const futureAnswer: ChapterAnswer =
    r.totalProfit > 0
      ? {
          tone: Number.isFinite(r.irr) && r.irr >= 8 ? "good" : "warn",
          text: `+${dk(r.totalProfit)} kr efter ${r.holdYears} år${Number.isFinite(r.irr) ? `, ${num(r.irr)} % om året` : ""}`,
        }
      : { tone: "bad", text: `${dk(r.totalProfit)} kr efter ${r.holdYears} år` };

  const docCount = provenanceRows.filter((row) => row.tier === "doc").length;
  const dataShare = provenanceRows.length ? docCount / provenanceRows.length : 0;
  const dataAnswer: ChapterAnswer = {
    tone: dataShare >= 0.6 ? "good" : dataShare >= 0.3 ? "warn" : "bad",
    text: `${docCount} af ${provenanceRows.length} nøgletal er dokumenteret`,
  };

  const navItems: NavItem[] = [
    { id: "overblik", label: "Dommen", tone: heroTone },
    { id: "oekonomi", label: "Økonomi", tone: cashAnswer.tone },
    ...(showPriceChapter ? [{ id: "pris", label: "Pris", tone: priceAnswer.tone }] : []),
    { id: "risici", label: "Risici", tone: riskAnswer.tone },
    { id: "potentiale", label: "Potentiale", tone: potentialAnswer.tone },
    { id: "fremtid", label: "Fremtid", tone: futureAnswer.tone },
    { id: "data", label: "Data", tone: dataAnswer.tone },
  ];

  const exportExcel = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          area: propMeta.area ?? bbr?.bbr?.enhedsareal_m2 ?? null,
          units: 1,
          ...inputs,
        }),
      });
      if (res.status === 402) { setUpgrade("excel"); return; }
      const blob = await res.blob();
      const u = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = u; link.download = "NordInvest-analyse.xlsx"; link.click();
      URL.revokeObjectURL(u);
    } finally {
      setExporting(false);
    }
  };

  const openBankReport = () => {
    const payload = {
      inputs,
      address,
      bbr: bbr
        ? {
            byggeaar: bbr.bbr?.byggeaar ?? null,
            area: propMeta.area ?? bbr.bbr?.enhedsareal_m2 ?? null,
            rooms: propMeta.rooms ?? bbr.bbr?.antalVaerelser ?? null,
            energyLabel: null,
          }
        : null,
      cal: { confidence: cal.confidence, region: cal.region, regionCount: cal.regionCount, tier: cal.tier },
      rentEstimated,
      generatedAt: new Date().toISOString(),
    };
    // Hand the payload to the report tab via localStorage. sessionStorage is NOT
    // copied into a tab opened with `noopener`, which is why the old report was
    // always empty. localStorage is shared across same-origin tabs, so it works.
    try {
      const json = JSON.stringify(payload);
      localStorage.setItem("nordinvest:report", json);
      sessionStorage.setItem("nordinvest:report", json); // belt-and-braces
    } catch {
      /* storage may be blocked — the report page shows a fallback */
    }
    window.open("/rapport", "_blank");
  };

  const startWatch = async () => {
    if (!listingUrl) return;
    const supabase = await loadSupabase();
    if (!supabase) { window.location.href = "/auth/signup"; return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/auth/signup?next=/analyseren"; return; }
    setWatch({ status: "saving" });
    const todayStr = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("watches").insert({
      user_id: user.id,
      listing_url: listingUrl,
      address,
      strategy: inputs.strategy,
      inputs: { ...inputs },
      baseline_price: inputs.price,
      baseline_score: r.score,
      current_price: inputs.price,
      current_score: r.score,
      price_history: [{ d: todayStr, price: inputs.price, score: r.score }],
      status: "active",
    });
    if (error) setWatch({ status: "error", msg: error.message });
    else setWatch({ status: "saved" });
  };

  const saveToPortfolio = async () => {
    const supabase = await loadSupabase();
    if (!supabase) {
      window.location.href = "/auth/signup";
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/auth/signup?next=/analyseren";
      return;
    }
    setSave({ status: "saving" });
    // No quota check here anymore: the monthly limit is now enforced on the
    // analysis run itself (the paywall). Saving only flips an already-counted
    // row to saved_to_portfolio, so it must never be blocked.
    const payload = {
      user_id: user.id,
      property_url: address ?? null,
      property_data: { ...inputs, address },
      strategy: inputs.strategy,
      analysis_result: {
        capRate: r.capRate,
        cashOnCash: r.cashOnCash,
        dscr: r.dscr,
        cashFlow: r.cashFlow,
        irr: r.irr,
        grossYield: r.grossYield,
        equityMultiple: r.equityMultiple,
      },
      investment_score: displayScore,
      verdict: displayVerdict,
      saved_to_portfolio: true,
    };
    // Flip the row this analysis already logged to "saved" (no double-count);
    // if it's missing for any reason, insert a fresh saved row instead.
    let error = null;
    if (usageRowIdRef.current) {
      const res = await supabase.from("analyses").update(payload).eq("id", usageRowIdRef.current).eq("user_id", user.id);
      error = res.error;
    }
    if (!usageRowIdRef.current || error) {
      const res = await supabase.from("analyses").insert(payload);
      error = res.error;
    }
    if (error) setSave({ status: "error", msg: error.message });
    else setSave({ status: "saved" });
  };

  // Time-savings survey → stored on the analysis row's property_data (jsonb), so
  // the admin validation cockpit can read median time saved + accuracy. No new
  // table needed; RLS already lets a user update their own analyses row.
  const submitTimeSavings = async (manualMinutes: number, accuracy: string) => {
    const id = usageRowIdRef.current;
    if (!id) return;
    const supabase = await loadSupabase();
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const toolSeconds = Math.round((Date.now() - mountedAtRef.current) / 1000);
    const feedback = { manualMinutes, accuracy, toolSeconds, at: new Date().toISOString() };
    await supabase
      .from("analyses")
      .update({ property_data: { ...inputs, address, feedback } })
      .eq("id", id)
      .eq("user_id", user.id);
    captureEvent("time_savings_reported", { manualMinutes, accuracy });
  };

  // The input form lives in two places: inline as the page's main tool before
  // anything is analysed, and in the "Justér tallene" sheet once a verdict is
  // on screen (so the results get the full width and the reader edits live).
  const extractNote = ex.status !== "idle" && (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        "flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm leading-snug",
        ex.status === "loading" && "bg-blue-50 text-blue-900",
        ex.status === "ok" && "bg-emerald-50 text-emerald-900",
        ex.status === "fail" && "bg-amber-50 text-amber-900",
      )}
    >
      {ex.status === "loading" ? <Loader2 aria-hidden size={16} className="mt-0.5 shrink-0 animate-spin" />
        : ex.status === "ok" ? <CheckCircle2 aria-hidden size={16} className="mt-0.5 shrink-0" />
        : <AlertCircle aria-hidden size={16} className="mt-0.5 shrink-0" />}
      <span>
        {ex.status === "loading" && ex.stage}
        {ex.status === "ok" && (
          <>Hentet fra annoncen: <b className="font-semibold">{(ex.found ?? []).filter((k) => FIELD_LABELS[k]).map((k) => FIELD_LABELS[k]).join(", ") || "grunddata"}</b>.
            {ex.estimated && ex.estimated.length > 0 && <> Estimeret: {ex.estimated.join(", ")}.</>} Ret gerne tallene.</>
        )}
        {ex.status === "fail" && ex.msg}
      </span>
    </div>
  );

  const form = (
    <div className="space-y-7">
      {extractNote}
      <fieldset className="space-y-4">
        <legend className="text-[15px] font-semibold text-slate-900">Ejendom</legend>
        <Field label="Købspris" name="price" value={inputs.price} onChange={(n) => set({ price: n })} suffix="kr" step={25000} />
        <Field label={isInvestment ? "Driftsindtægt pr. md. (netto)" : "Månedlig leje"} name="monthlyRent" value={inputs.monthlyRent} onChange={(n) => set({ monthlyRent: n })} suffix="kr/md." step={500} />
      </fieldset>
      <fieldset className="space-y-4">
        <legend className="text-[15px] font-semibold text-slate-900">Finansiering</legend>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Udbetaling" name="downPaymentPct" value={inputs.downPaymentPct} onChange={(n) => set({ downPaymentPct: n })} suffix="%" />
          <Field label="Rente" name="interestRate" value={inputs.interestRate} onChange={(n) => set({ interestRate: n })} suffix="%" step={0.25} />
        </div>
      </fieldset>
      <fieldset className="space-y-4">
        <legend className="text-[15px] font-semibold text-slate-900">Drift</legend>
        <Field label="Faste udgifter" name="monthlyOpex" value={inputs.monthlyOpex} onChange={(n) => set({ monthlyOpex: n })} suffix="kr/md." step={250} />
      </fieldset>

      <fieldset>
        <legend className="text-[15px] font-semibold text-slate-900">Strategi</legend>
        <div role="radiogroup" aria-label="Strategi" className="flex gap-0.5 rounded-full bg-slate-100 p-1">
          {strategies.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={inputs.strategy === s.id}
              onClick={() => set({ strategy: s.id })}
              className={clsx(
                "flex-auto whitespace-nowrap rounded-full px-2 py-2 text-[13px] font-semibold transition-[background-color,color,box-shadow] max-[380px]:px-1.5 max-[380px]:text-[12.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                inputs.strategy === s.id ? "bg-white text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.12)]" : "text-slate-500 hover:text-slate-900",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="border-t border-slate-100 pt-5">
        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          aria-expanded={advanced}
          aria-controls="advanced-fields"
          className="-my-2.5 flex min-h-11 w-full items-center justify-between rounded-lg py-2.5 text-[15px] font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          Avancerede antagelser
          <ChevronDown aria-hidden size={18} className={clsx("text-slate-400 transition-transform", advanced && "rotate-180")} />
        </button>
        {advanced && (
          <div id="advanced-fields" className="mt-4 grid grid-cols-2 gap-3">
            <Field label="Løbetid" name="termYears" value={inputs.termYears} onChange={(n) => set({ termYears: n })} suffix="år" />
            <Field label="Ejerperiode" name="holdYears" value={inputs.holdYears} onChange={(n) => set({ holdYears: n })} suffix="år" />
            <Field label="Tomgang" name="vacancyPct" value={inputs.vacancyPct} onChange={(n) => set({ vacancyPct: n })} suffix="%" step={0.5} />
            <Field label="Vedligehold" name="maintenancePct" value={inputs.maintenancePct} onChange={(n) => set({ maintenancePct: n })} suffix="% af leje" step={0.5} />
            <Field label="Købsomkostninger" name="acqCostPct" value={inputs.acqCostPct} onChange={(n) => set({ acqCostPct: n })} suffix="%" step={0.5} />
            <Field label="Værdistigning" name="appreciationPct" value={inputs.appreciationPct} onChange={(n) => set({ appreciationPct: n })} suffix="%/år" step={0.5} />
            <Field label="Lejevækst" name="rentGrowthPct" value={inputs.rentGrowthPct} onChange={(n) => set({ rentGrowthPct: n })} suffix="%/år" step={0.5} />
          </div>
        )}
      </div>
    </div>
  );

  // Arriving with a link or a saved analysis: hold the verdict's place until the
  // effects above have loaded it (never flash the empty form or example numbers).
  if (!ran && (urlParam || priceParam || savedParam)) return <LoadingBand />;

  // Before anything is analysed: the form is the page's tool, shown inline.
  if (!ran) {
    return (
      <section aria-labelledby="own-numbers" className="px-4 pb-20 sm:px-6">
        <div className="mx-auto grid max-w-[1080px] gap-10 rounded-[28px] bg-[#f4f6f9] p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:gap-16 lg:p-14">
          <div>
            <h2 id="own-numbers" className="text-[32px] font-semibold leading-[1.08] tracking-[-0.03em] text-slate-900 [text-wrap:balance] sm:text-[40px]">
              Intet link? Indtast tallene selv.
            </h2>
            <p className="mt-4 max-w-md text-[17px] leading-relaxed text-slate-600">
              Pris, leje og faste udgifter er nok til en dom. Resten har fornuftige standardværdier, som du kan rette bagefter.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-7">
            {form}
            <button
              type="button"
              onClick={() => { setRan(true); window.scrollTo({ top: 0 }); }}
              className="mt-7 inline-flex w-full items-center justify-center rounded-full bg-blue-600 px-6 py-3.5 text-[17px] font-semibold text-white transition-[background-color,transform] hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 active:scale-[0.98]"
            >
              Analysér ejendommen
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Alternating band tint, in render order: the colour change is the divider.
  let band = 0;
  const tint = (): "white" | "tint" => (band++ % 2 === 0 ? "white" : "tint");
  const navTitle = address ? address.split(",")[0] : "Din analyse";

  return (
    <div className="min-w-0">
      {/* A link without deal data has no numbers until the listing is read. A
          deal-seeded link already has them, so it renders at once. */}
      {ex.status === "loading" && !priceParam ? (
        <LoadingBand stage={ex.stage} />
      ) : signupGated ? (
        <div className="px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-[1080px]">
            <SignupGate score={displayScore} rating={displayRating} verdict={displayVerdict} scoreColor={scoreColor} />
          </div>
        </div>
      ) : gated ? (
        <div className="px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-[1080px]">
            <PaywallGate
              score={displayScore}
              rating={displayRating}
              verdict={displayVerdict}
              max={freeMax}
              scoreColor={scoreColor}
            />
          </div>
        </div>
      ) : (
        <>
          {ex.status === "fail" && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 sm:px-6">
              <div role="alert" className="mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-3 text-[15px] text-amber-900">
                <span className="flex items-start gap-2">
                  <AlertCircle aria-hidden size={18} className="mt-0.5 shrink-0" />
                  {ex.msg}
                </span>
                <button
                  type="button"
                  onClick={() => setSheetOpen(true)}
                  className="rounded-full bg-amber-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-900 focus-visible:ring-offset-2"
                >
                  Indtast tallene
                </button>
              </div>
            </div>
          )}

          <DealHero
            images={images}
            address={address}
            score={displayScore}
            rating={displayRating}
            headline={heroHeadline}
            verdict={displayVerdict}
            tone={heroTone}
            notes={heroNotes}
            metrics={heroMetrics}
            probability={{ pct: Math.round(uncertainty.pCashFlowPositive * 100), runs: uncertainty.runs }}
            listingUrl={listingUrl}
            sourceLabel={sourceName(listingUrl)}
            kindLabel={isInvestment ? `Investeringsejendom${subcatParam ? `, ${subcatParam}` : ""}` : `Strategi: ${strategies.find((s) => s.id === inputs.strategy)?.label ?? ""}`}
          />

          <ChapterNav items={navItems} title={navTitle} onAdjust={() => setSheetOpen(true)} />

          <Chapter id="oekonomi" question="Tjener den penge?" answer={cashAnswer} tint={tint()}>
            <Panel>
              <MoneyFlow
                rent={r.annualRent / 12}
                vacancy={r.opex.vacancy / 12}
                maintenance={r.opex.maintenance / 12}
                fixed={r.opex.fixed / 12}
                mortgage={r.monthlyMortgage}
                cashFlow={r.cashFlow}
              />
            </Panel>
            <Panel>
              <h3 className="text-[21px] font-semibold tracking-[-0.02em] text-slate-900">Alle nøgletal</h3>
              <p className="mt-1 text-[15px] text-slate-500">Tryk på spørgsmålstegnet for at se, hvad et tal betyder.</p>
              <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-7 md:grid-cols-4">
                <KeyStat
                  label="Cash flow pr. md." value={dk(r.cashFlow)} unit="kr" tone={cfTone}
                  sub={r.cashFlow >= 0 ? `+${dk(r.annualCashFlow)} kr om året` : `−${dk(Math.abs(r.annualCashFlow))} kr om året`}
                  explain="Det, der reelt lander på din konto hver måned, når lejen har betalt lånet og alle udgifter. Positivt betyder, at ejendommen betaler dig. Negativt betyder, at du lægger penge til hver måned."
                  how="Månedlig leje minus ydelsen på lånet minus alle driftsudgifter."
                />
                <KeyStat
                  label="Nettoafkast" value={num(r.capRate)} unit="%"
                  tone={r.capRate >= 5 ? "text-emerald-600" : r.capRate >= 3 ? "text-slate-900" : "text-rose-600"}
                  sub="Før lån, om året"
                  explain={`Hvor mange procent af prisen ejendommen tjener om året, efter driftsudgifter men før lån. ${num(r.capRate)} % betyder, at ejendommen selv giver ${num(r.capRate)} % af sin pris tilbage hvert år. Højere er bedre.`}
                  how="Driftsresultatet (leje minus tomgang, vedligehold og faste udgifter) delt med købsprisen."
                />
                <KeyStat
                  label="Kontantafkast" value={num(r.cashOnCash)} unit="%"
                  tone={r.cashOnCash >= 8 ? "text-emerald-600" : r.cashOnCash >= 0 ? "text-slate-900" : "text-rose-600"}
                  sub={`På ${dk(r.cashInvested)} kr investeret`}
                  explain={`Hvor meget dine egne penge tjener om året. Du lægger ${dk(r.cashInvested)} kr (udbetaling og købsomkostninger) og får ${dk(r.annualCashFlow)} kr tilbage i cash flow. Det er ${num(r.cashOnCash)} %.`}
                  how="Årligt cash flow delt med de penge, du selv lægger."
                />
                <KeyStat
                  label="Gældsdækning" value={num(r.dscr)} tone={dscrTone}
                  sub={r.dscr >= 1.25 ? "Banken siger typisk ja" : r.dscr >= 1 ? "På kanten" : "Under 1,0"}
                  explain={`Kan lejen betale lånet? 1,0 er lige akkurat. ${num(r.dscr)} betyder, at ejendommen tjener ${num(r.dscr)} gange så meget som ydelsen. Banker vil typisk gerne se mindst 1,25.`}
                  how="Driftsresultatet (NOI) delt med den årlige ydelse på lånet."
                />
                <KeyStat
                  label="Bruttoafkast" value={num(r.grossYield)} unit="%"
                  sub="Før udgifter"
                  explain="Årlig leje i forhold til prisen, før udgifter. Et hurtigt førstetjek. Nettoafkastet er det mere ærlige tal, fordi det trækker udgifterne fra."
                  how="Årlig leje delt med købsprisen."
                />
                <KeyStat
                  label={`IRR over ${r.holdYears} år`} value={num(r.irr)} unit="%"
                  tone={isFinite(r.irr) && r.irr >= 8 ? "text-emerald-600" : "text-slate-900"}
                  sub="Cash flow og værdistigning"
                  explain="Det samlede årlige afkast på dine penge over hele perioden: cash flow og værdistigning lagt sammen til én procent. Over 8 til 10 % er stærkt."
                  how="Alle pengestrømme (udbetaling ud nu, cash flow ind hvert år, salg til sidst) regnet om til én årlig rente."
                />
                <KeyStat
                  label="Equity multiple" value={num(r.equityMultiple)} unit="x"
                  sub="Penge tilbage pr. krone"
                  explain={`Hvor mange gange du får dine penge igen i alt. ${num(r.equityMultiple)}x betyder, at du for hver krone, du lægger, får ${num(r.equityMultiple)} kr tilbage over perioden.`}
                  how="Alt du får ud (samlet cash flow og nettoprovenu ved salg) delt med det, du selv lægger."
                />
                <KeyStat
                  label="Break-even belægning" value={num(r.breakEvenOccupancy, 0)} unit="%"
                  sub="Lavere giver mere buffer"
                  explain={`Hvor tom ejendommen må stå, før du taber penge. ${num(r.breakEvenOccupancy, 0)} % betyder, at det går lige op, selv hvis den kun er udlejet ${num(r.breakEvenOccupancy, 0)} % af tiden. Over 100 % betyder, at lejen ikke dækker, heller ikke fuldt udlejet.`}
                  how="Hvor stor en del af lejen, der skal til for at dække lån og udgifter."
                />
              </div>
            </Panel>
            <Details label="hele budgettet, finansieringen og usikkerheden">
              <div className="grid gap-10 md:grid-cols-2">
                <div>
                  <h3 className="text-[17px] font-semibold text-slate-900">Driftsbudget, år 1</h3>
                  <dl className="mt-4 space-y-2.5 text-[15px]">
                    <Row l="Lejeindtægt" v={kr(r.annualRent)} pos />
                    <Row l="Tomgang" v={"−" + kr(r.opex.vacancy)} />
                    <Row l="Vedligehold" v={"−" + kr(r.opex.maintenance)} />
                    <Row l="Faste udgifter" v={"−" + kr(r.opex.fixed)} />
                    <div className="border-t border-slate-100 pt-2.5"><Row l="Driftsresultat (NOI)" v={kr(r.noi)} strong /></div>
                    <Row l="Ydelse på lån" v={"−" + kr(r.monthlyMortgage * 12)} />
                    <div className="border-t border-slate-100 pt-2.5"><Row l="Cash flow om året" v={kr(r.annualCashFlow)} strong pos={r.annualCashFlow >= 0} /></div>
                  </dl>
                </div>
                <div>
                  <h3 className="text-[17px] font-semibold text-slate-900">Finansiering</h3>
                  <dl className="mt-4 space-y-2.5 text-[15px]">
                    <Row l="Købspris" v={kr(inputs.price)} />
                    <Row l="Udbetaling" v={kr(r.downPayment)} />
                    <Row l="Købsomkostninger" v={kr(r.cashInvested - r.downPayment)} />
                    <div className="border-t border-slate-100 pt-2.5"><Row l="Du investerer" v={kr(r.cashInvested)} strong /></div>
                    <Row l="Lån" v={kr(r.loan)} />
                    <Row l="Belåningsgrad" v={pct(r.ltv, 0)} />
                    <Row l="Månedlig ydelse" v={krMd(r.monthlyMortgage)} />
                  </dl>
                </div>
              </div>
              <div className="mt-10 border-t border-slate-100 pt-8">
                <ConfidenceBands u={uncertainty} />
              </div>
            </Details>
          </Chapter>

          {showPriceChapter && (
            <Chapter id="pris" question="Er prisen fair?" answer={priceAnswer} tint={tint()}>
              {(priceBench || rentBench) && (
                <div className="grid gap-5 md:grid-cols-2">
                  {priceBench && propertyPriceM2 && (
                    <MarketBenchmark propertyPriceM2={propertyPriceM2} benchmark={priceBench} />
                  )}
                  {rentBench && (
                    <RentBenchmark
                      benchmark={rentBench}
                      currentRent={inputs.monthlyRent}
                      region={rentBench.region}
                      type={rentBench.type}
                      analysisId={usageRowIdRef.current}
                      areaM2={area}
                    />
                  )}
                </div>
              )}
              {zip && area && area > 10 && inputs.price > 0 && (
                <div className="space-y-5">
                  <Comparables zip={String(zip)} type={propType} areaM2={area} askingPrice={inputs.price} />
                  <ExpenseCheck zip={String(zip)} type={propType} areaM2={area} statedExpense={inputs.monthlyOpex} />
                </div>
              )}
            </Chapter>
          )}

          <Chapter id="risici" question="Hvad kan gå galt?" answer={riskAnswer} tint={tint()}>
            <Panel>
              <RateStress
                rate={inputs.interestRate}
                breakEvenRate={r.breakEvenRate}
                loan={r.loan}
                termYears={inputs.termYears ?? 30}
                noiMonthly={r.noi / 12}
              />
            </Panel>
            {address && <FutureBurdens address={address} />}
          </Chapter>

          <Chapter id="potentiale" question="Er der skjult potentiale?" answer={potentialAnswer} tint={tint()}>
            {rentReserve && <RentReserve reserve={rentReserve} />}
            <RenovationModule
              price={inputs.price}
              downPaymentPct={inputs.downPaymentPct}
              interestRate={inputs.interestRate}
              termYears={inputs.termYears}
              monthlyRent={inputs.monthlyRent}
              monthlyOpex={inputs.monthlyOpex}
              images={images}
              address={address}
              byggeaar={bbr?.bbr?.byggeaar ?? null}
              area={propMeta.area ?? bbr?.bbr?.enhedsareal_m2 ?? null}
              rooms={propMeta.rooms ?? bbr?.bbr?.antalVaerelser ?? null}
              onSnapshot={setRenoSnap}
            />
          </Chapter>

          <Chapter id="fremtid" question={`Hvad bliver det til om ${r.holdYears} år?`} answer={futureAnswer} tint={tint()}>
            <Panel>
              <ProjectionStory
                data={r.projection.map((y) => ({ year: y.year, paid: inputs.price - y.loanBalance, growth: y.propertyValue - inputs.price, cumulativeCashFlow: y.cumulativeCashFlow }))}
                downPayment={r.downPayment}
                holdYears={r.holdYears}
                totalProfit={r.totalProfit}
                netSaleProceeds={r.netSaleProceeds}
                irr={r.irr}
                appreciationLabel={pct(inputs.appreciationPct, 0)}
                rentGrowthLabel={pct(inputs.rentGrowthPct, 0)}
              />
            </Panel>
          </Chapter>

          <Chapter id="data" question="Kan du stole på tallene?" answer={dataAnswer} tint={tint()}>
            <DataProvenance rows={provenanceRows} rentRule={rentRule} showRentCaveat={!isInvestment} />
            <BrainBadge
              regionName={regionLabel(cal.region)}
              tier={cal.tier}
              regionCount={cal.regionCount}
              globalCount={cal.globalCount}
              avgRating={cal.avgRating}
              observedAppreciationPct={cal.observedAppreciationPct}
            />
            {bbr && <BbrPanel data={bbr} />}
          </Chapter>

          {/* Next steps: one primary (blue), the rest as quiet outline pills. */}
          <section id="naeste" aria-labelledby="naeste-h" className="scroll-mt-32 bg-[#0a0e16] px-4 py-16 text-white sm:px-6 sm:py-20">
            <div className="mx-auto max-w-[1080px]">
              <h2 id="naeste-h" className="max-w-2xl text-[32px] font-semibold leading-[1.08] tracking-[-0.03em] [text-wrap:balance] sm:text-[44px]">
                Gem den, del den, eller tag den med i banken.
              </h2>
              {usage && <UsageNudge {...usage} />}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {save.status === "saved" ? (
                  <a href="/dashboard" className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-5 py-3 text-[15px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-400/30 hover:bg-emerald-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
                    <Check aria-hidden size={17} /> Gemt. Se porteføljen
                  </a>
                ) : (
                  <button type="button" onClick={saveToPortfolio} disabled={save.status === "saving"}
                    className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-[15px] font-semibold text-white transition-[background-color,transform] hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6aa8ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0e16] active:scale-[0.97] disabled:opacity-60">
                    {save.status === "saving" ? <Loader2 aria-hidden size={17} className="animate-spin" /> : <Bookmark aria-hidden size={17} />}
                    {save.status === "saving" ? "Gemmer…" : "Gem til portefølje"}
                  </button>
                )}
                <button type="button" onClick={() => requirePaid("report", openBankReport)} className={darkPill}>
                  <FileText aria-hidden size={17} /> Bankrapport
                  {plan.loaded && !plan.paid && <PaidTag />}
                </button>
                <button type="button" onClick={() => requirePaid("excel", exportExcel)} disabled={exporting} className={darkPill}>
                  {exporting ? <Loader2 aria-hidden size={17} className="animate-spin" /> : <FileSpreadsheet aria-hidden size={17} />}
                  {exporting ? "Laver Excel…" : "Excel"}
                  {plan.loaded && !plan.paid && <PaidTag />}
                </button>
                {listingUrl && (
                  watch.status === "saved" ? (
                    <a href="/dashboard" className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-5 py-3 text-[15px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-400/30 hover:bg-emerald-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
                      <BellRing aria-hidden size={17} /> Prisvagt aktiv
                    </a>
                  ) : (
                    <button type="button" onClick={startWatch} disabled={watch.status === "saving"} className={darkPill}>
                      {watch.status === "saving" ? <Loader2 aria-hidden size={17} className="animate-spin" /> : <Bell aria-hidden size={17} />}
                      Overvåg prisen
                    </button>
                  )
                )}
                <ShareAnalysis
                  className={darkPill}
                  title={address ? `Analyse af ${address.split(",")[0]}` : "Min analyse af boligen"}
                  params={{
                    url: urlParam,
                    addr: address,
                    price: inputs.price,
                    rent: inputs.monthlyRent,
                    opex: inputs.monthlyOpex,
                    downPaymentPct: inputs.downPaymentPct,
                    interestRate: inputs.interestRate,
                  }}
                />
              </div>
              <div aria-live="polite">
                {save.status === "limit" && (
                  <p className="mt-4 text-[15px] text-amber-200">
                    Du har brugt dine analyser for denne måned. <a href="/priser" className="font-semibold underline">Opgradér</a> for at gemme flere boliger.
                  </p>
                )}
                {save.status === "error" && <p className="mt-4 text-[15px] text-rose-300">Kunne ikke gemme: {save.msg}. Prøv igen om lidt.</p>}
                {watch.status === "error" && <p className="mt-4 text-[15px] text-rose-300">Kunne ikke starte prisvagten: {watch.msg}. Prøv igen om lidt.</p>}
              </div>
              {listingUrl && watch.status === "idle" && (
                <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/55">
                  Prisvagten tjekker annoncen hver dag og giver dig besked, hvis prisen falder.
                </p>
              )}

              <div className="mt-12 space-y-6 border-t border-white/10 pt-8 text-slate-900">
                {analysisLogged && !tsHidden && (
                  <div className="rounded-2xl bg-white p-5 sm:p-6">
                    <TimeSavingsCapture onSubmit={submitTimeSavings} onDismiss={() => setTsHidden(true)} />
                  </div>
                )}
                <div className="rounded-2xl bg-white p-5 sm:p-6">
                  <PrecisionFeedback region={region} strategy={inputs.strategy} onSaved={() => { const q = region ? `?region=${encodeURIComponent(region)}` : ""; fetch(`/api/calibration${q}`).then((r) => r.json()).then(setCal).catch(() => {}); }} />
                </div>
                {savedParam && (
                  <OutcomeForm
                    analysisId={savedParam}
                    region={region}
                    predicted={{ price: inputs.price, monthlyRent: inputs.monthlyRent, appreciationPct: inputs.appreciationPct }}
                  />
                )}
              </div>
              <div id="analyse-end" aria-hidden className="h-px" />
              <UpgradeDialog reason={upgrade} onClose={() => setUpgrade(null)} />
            </div>
          </section>
        </>
      )}

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Justér tallene"
        description="Ret et tal, så regnes hele analysen om med det samme."
        footer={
          <button
            type="button"
            onClick={() => setSheetOpen(false)}
            className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-[15px] font-semibold text-white transition-[background-color,transform] hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 active:scale-[0.98]"
          >
            Se resultatet
          </button>
        }
      >
        {form}
      </Sheet>

      {/* Analytikeren: in-analysis expert chat (appears once an analysis exists) */}
      {!gated && !(ex.status === "loading" && !priceParam) && (
        <AnalystChat
          context={{
            market: isInvestment ? "investering" : "bolig",
            subcategory: subcatParam,
            address,
            // property facts (from listing + BBR)
            price: inputs.price,
            area: propMeta.area ?? bbr?.bbr?.enhedsareal_m2 ?? null,
            rooms: propMeta.rooms ?? bbr?.bbr?.antalVaerelser ?? null,
            yearBuilt: bbr?.bbr?.byggeaar ?? null,
            heating: bbr?.bbr?.opvarmning ?? null,
            // financing & operating inputs
            monthlyRent: inputs.monthlyRent,
            downPaymentPct: inputs.downPaymentPct,
            interestRate: inputs.interestRate,
            termYears: inputs.termYears,
            monthlyOpex: inputs.monthlyOpex,
            vacancyPct: inputs.vacancyPct,
            maintenancePct: inputs.maintenancePct,
            appreciationPct: inputs.appreciationPct,
            rentGrowthPct: inputs.rentGrowthPct,
            holdYears: inputs.holdYears,
            strategy: inputs.strategy,
            // headline verdict
            score: displayScore,
            rating: displayRating,
            verdict: displayVerdict,
            // computed key figures (year 1 + hold period)
            annualRent: r.annualRent,
            effectiveRent: r.effectiveRent,
            noi: r.noi,
            opexBreakdown: r.opex,
            cashFlow: r.cashFlow,
            annualCashFlow: r.annualCashFlow,
            capRate: r.capRate,
            grossYield: r.grossYield,
            cashOnCash: r.cashOnCash,
            dscr: r.dscr,
            breakEvenRate: r.breakEvenRate,
            breakEvenOccupancy: r.breakEvenOccupancy,
            irr: r.irr,
            equityMultiple: r.equityMultiple,
            totalProfit: r.totalProfit,
            netSaleProceeds: r.netSaleProceeds,
            saleValue: r.saleValue,
            loan: r.loan,
            cashInvested: r.cashInvested,
            monthlyMortgage: r.monthlyMortgage,
            rentEstimated,
            // BRRRR / renovation + AI photo-condition (whatever's on screen now)
            renovation: renoSnap,
          }}
        />
      )}
    </div>
  );
}

const darkPill =
  "inline-flex items-center gap-2 rounded-full bg-white/[0.08] px-5 py-3 text-[15px] font-semibold text-white ring-1 ring-inset ring-white/15 transition-[background-color,transform] hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6aa8ff] active:scale-[0.97] disabled:opacity-60";

/** While the listing is being read: the verdict's place holds a calm skeleton, not example numbers. */
function LoadingBand({ stage }: { stage?: string }) {
  return (
    <section aria-busy="true" aria-label="Analysen hentes" className="min-h-[calc(100svh-4rem)] bg-[#0a0e16] px-4 pb-16 pt-12 text-white sm:px-6 sm:pt-14">
      <div className="mx-auto max-w-[1080px]">
        <p role="status" aria-live="polite" className="flex items-center gap-2 text-[15px] font-medium text-white/70">
          <Loader2 aria-hidden size={16} className="animate-spin" />
          {stage ?? "Henter annoncen…"}
        </p>
        <div className="mt-5 h-14 w-2/3 max-w-md animate-pulse rounded-xl bg-white/[0.07] motion-reduce:animate-none sm:h-16" />
        <div className="mt-4 h-5 w-full max-w-lg animate-pulse rounded-lg bg-white/[0.05] motion-reduce:animate-none" />
        <div className="mt-12 grid grid-cols-2 gap-6 border-t border-white/10 pt-6 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-3.5 w-24 animate-pulse rounded bg-white/[0.06] motion-reduce:animate-none" />
              <div className="mt-3 h-8 w-28 animate-pulse rounded-lg bg-white/[0.08] motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Row({ l, v, pos, strong }: { l: string; v: string; pos?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={clsx("min-w-0 text-slate-600", strong && "font-semibold text-slate-900")}>{l}</dt>
      <dd className={clsx("shrink-0 whitespace-nowrap tnum font-semibold tabular-nums", pos === true && "text-emerald-600", pos === false && "text-rose-500", pos === undefined && "text-slate-900")}>{v}</dd>
    </div>
  );
}

function PaidTag() {
  return (
    <span className="ml-0.5 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-white/70 ring-1 ring-inset ring-white/15">
      Starter
    </span>
  );
}

"use client";

import { zipFromAddress } from "@/lib/zip";
import Link from "next/link";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader2, CheckCircle2, AlertCircle, AlertTriangle, XCircle, Info, FileSpreadsheet, ChevronDown, ChevronRight, HelpCircle, X, Bookmark, Check, FileText, Bell, BellRing, ArrowRight, CalendarPlus, ListPlus, Gavel, Upload, SlidersHorizontal } from "lucide-react";
import { EMPTY_MAPPE, STAGES, STAGE_LABEL, type Mappe, type Stage } from "@/lib/mappe/checklist";
import { AppHero } from "@/components/analyzer/story/AppHero";
import type { HeroMetric } from "@/components/analyzer/story/DealHero";
import { toneNum } from "@/components/analyzer/story/tone";
import { EventDialog, type DialogState } from "@/components/app/EventDialog";
import { Toast } from "@/components/app/ui";
import { addTaskToRow } from "@/lib/app/pipeline";
import { toTask } from "@/lib/app/calendar";
import { analyze, kr, krMd, pct, num, type Strategy, type AnalysisResult } from "@/lib/analysis";
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
import { MoneyFlow } from "@/components/analyzer/story/MoneyFlow";
import { Chapter, ChapterNav, Details, Panel, type ChapterAnswer, type NavItem } from "@/components/analyzer/story/Chapter";
import { RateStress } from "@/components/analyzer/story/RateStress";
import type { Tone } from "@/components/analyzer/story/tone";
import type { RentBenchmark as RentBench } from "@/lib/rent";
import { computeRentReserve } from "@/lib/rent-reserve";
import { effectiveRentArea, estimateMonthlyRent } from "@/lib/rent-estimate";
import { purchaseCostPct } from "@/lib/dk-fees";
import { RentalSheet } from "@/components/analyzer/RentalSheet";
import { parentsView } from "@/lib/parents";
import { Valuation } from "@/components/property/Valuation";
import { PaywallGate } from "@/components/analyzer/PaywallGate";
import { NumberInput } from "@/components/ui/NumberInput";
import { SignupGate } from "@/components/analyzer/SignupGate";
import { UpgradeDialog, type UpgradeReason } from "@/components/upgrade/UpgradeDialog";
import { ShareAnalysis } from "@/components/analyzer/ShareAnalysis";
import { ANON_FREE, countAnonAnalysis } from "@/lib/plan";
import { TimeSavingsCapture } from "@/components/analyzer/TimeSavingsCapture";
import { captureEvent } from "@/lib/analytics-events";
import { buildProvenance, rentRegulationRule } from "@/lib/provenance";
import type { PriceBenchmark } from "@/lib/reference";
import { CommercialStory } from "@/components/analyzer/CommercialStory";

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
  { id: "value_add", label: "Renovering" },
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
  const [fullSheet, setFullSheet] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [save, setSave] = useState<{ status: "idle" | "saving" | "saved" | "limit" | "error"; msg?: string; id?: string }>({ status: "idle" });
  const [saveStage, setSaveStage] = useState<Stage>("screening");
  // The analysis as tabs inside the app, and the appointment dialog it can open.
  const [tab, setTab] = useState("overblik");
  const [planFor, setPlanFor] = useState<DialogState>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
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
  const [signupGated, setSignupGated] = useState(false);
  const [, setUsage] = useState<{ authenticated: boolean; used: number; max: number; unlimited: boolean } | null>(null);
  const [upgrade, setUpgrade] = useState<UpgradeReason | null>(null);
  // The analyser only runs inside the closed platform, where every member has
  // the bank report and Excel: no upgrade step in between.
  const requirePaid = (_reason: UpgradeReason, action: () => void) => action();

  const [bbr, setBbr] = useState<BbrEnrich | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [rentEstimated, setRentEstimated] = useState(false);
  const [renoSnap, setRenoSnap] = useState<RenovationSnapshot | null>(null);
  // Unit-level facts read straight from the listing. These are authoritative for
  // THIS apartment (area, rooms); BBR's enhed can be a representative unit and
  // its boligareal is the whole building — so the listing wins for the unit.
  const [propMeta, setPropMeta] = useState<{ area: number | null; rooms: number | null }>({ area: null, rooms: null });
  const [priceBench, setPriceBench] = useState<PriceBenchmark | null>(null);
  const [listingType, setListingType] = useState<string | null>(null);
  const [bfe, setBfe] = useState<number | null>(null);
  const [rentBench, setRentBench] = useState<RentBench | null>(null);
  const [gated, setGated] = useState(false);
  const [freeMax, setFreeMax] = useState(3);
  const region = useMemo(() => regionFromAddress(address), [address]);
  // Postnummer parsed from the address — keys the documented market benchmark.
  const zip = useMemo(() => {
    const z = zipFromAddress(address);
    return z ? Number(z) : null;
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
  // Answers from the question flow (/analyseren/start or the front-page pop-up),
  // applied once the listing's own numbers are in so the user's answers win.
  const journeyApplied = useRef(false);
  const [journeyNote, setJourneyNote] = useState<string | null>(null);
  // What the buyer wants with the home, from the question flow: an ordinary
  // rental, or a forældrekøb where their child is the tenant.
  const [goal, setGoal] = useState<"cashflow" | "parents">("cashflow");

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
      downPaymentPct: Number.isFinite(dp) && dp > 0 ? dp : investment ? 40 : 20,
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
      // Keep the photo and the listing link, so a reopened case looks like the analysis it came from.
      if (typeof pd.listingUrl === "string") setListingUrl(pd.listingUrl);
      if (typeof pd.image === "string") setImages((cur) => (cur.length ? cur : [pd.image as string]));
      // Reopened from the ejendomsmappe: it is already saved, and saving again
      // must update this row, not create a second one.
      usageRowIdRef.current = savedParam;
      setSave({ status: "saved", id: savedParam });
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
      if (d?.fields?.propertyType) setListingType(String(d.fields.propertyType));
      if (Number(d?.fields?.bfe) > 0) setBfe(Number(d.fields.bfe));
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
          // No rent passed in and none in the listing: estimate it, never keep
          // the form's example rent.
          if (!foundKeys.includes("monthlyRent") && !(Number(searchParams.get("rent")) > 0)) {
            const a = Number(searchParams.get("area"));
            const z = zipFromAddress(searchParams.get("addr"));
            if (a > 10) {
              patch.monthlyRent = estimateMonthlyRent(z ? Number(z) : null, a, calRef.current.rentFactor);
              setRentEstimated(true);
            }
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
        else if (fld.area) {
          const z = zipFromAddress(String(fld.address ?? ""));
          patch.monthlyRent = estimateMonthlyRent(z ? Number(z) : null, Number(fld.area), calRef.current.rentFactor);
          estimated.push("leje");
        }
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
            ? "Boligen er ikke længere aktiv på Boligsiden. Indtast tallene under “Justér tallene”."
            : err === "invalid_url"
            ? "Linket er ugyldigt. Kopiér hele adressen fra boligportalen, og prøv igen."
            : err.startsWith("fetch_")
            ? "Siden kunne ikke hentes. Indtast tallene under “Justér tallene”."
            : "Data kunne ikke hentes fra linket. Indtast tallene under “Justér tallene”.";
        setEx({ status: "fail", msg });
      }
    };
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlParam]);

  useEffect(() => {
    if (journeyApplied.current || (ex.status !== "ok" && ex.status !== "fail")) return;
    const raw = searchParams.get("j");
    if (!raw) return;
    journeyApplied.current = true;
    let j: Record<string, unknown>;
    try { j = JSON.parse(decodeURIComponent(escape(atob(raw)))); } catch { return; }
    const patch = pickInputs(j);
    if (j.goal === "parents") setGoal("parents");
    const adminPct = Number(j.adminPct) || 0;
    setInputs((prev) => {
      const next = { ...prev, ...patch };
      if (adminPct > 0) next.monthlyOpex = Math.round(prev.monthlyOpex + (next.monthlyRent * adminPct) / 100);
      return next;
    });
    if (patch.monthlyRent) setRentEstimated(false);
    const bits = [
      patch.downPaymentPct != null && (patch.downPaymentPct >= 100 ? "kontant køb" : `${patch.downPaymentPct} % udbetaling`),
      patch.downPaymentPct != null && patch.downPaymentPct < 100 && patch.interestRate != null && `${String(patch.interestRate).replace(".", ",")} % rente`,
      patch.monthlyRent != null && `leje ${Math.round(patch.monthlyRent).toLocaleString("da-DK")} kr./md.`,
      adminPct > 0 && `administrator ${adminPct} % af lejen`,
      patch.vacancyPct === 0 && "ingen tomgang",
      patch.maintenancePct != null && `vedligehold ${patch.maintenancePct} % af lejen`,
      patch.holdYears != null && `ejertid ${patch.holdYears} år`,
      patch.strategy === "appreciation" && "vægt på værdistigning",
    ].filter(Boolean);
    setJourneyNote(bits.join(" · "));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex.status]);

  // Purchase costs follow the statutory fees for this price and loan (skøde,
  // pantebrev, rådgiver) until the user sets their own under Justér.
  const [acqTouched, setAcqTouched] = useState(false);
  useEffect(() => {
    if (acqTouched || !(inputs.price > 0)) return;
    const pctNow = Math.round(purchaseCostPct(inputs.price, inputs.price * (1 - inputs.downPaymentPct / 100)) * 100) / 100;
    if (Math.abs(pctNow - inputs.acqCostPct) > 0.01) setInputs((p) => ({ ...p, acqCostPct: pctNow }));
  }, [acqTouched, inputs.price, inputs.downPaymentPct, inputs.acqCostPct]);

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
    const t = searchParams.get("subcat") || listingType;
    fetch(`/api/reference?zip=${zip}${t ? `&type=${encodeURIComponent(t)}` : ""}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setPriceBench(d?.benchmark ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zip, isInvestment, listingType]);

  // Documented rent benchmark — DST HUS1-anchored + user observations overlay.
  // Residential only; commercial rent is baked into the NOI on those deals.
  // The listing's own type wins over the default; a villa compared with
  // ejerlejligheder gets every benchmark wrong.
  const propType = searchParams.get("subcat") || listingType || "condo";
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

  // The benchmark is kr./m² for a typical unit; scale it down for large homes
  // the same way the rent estimate does, so a big villa isn't "under market".
  const rentBenchSized = useMemo(
    () => (rentBench && area && area > 10 ? { ...rentBench, value: (rentBench.value * effectiveRentArea(area)) / area } : rentBench),
    [rentBench, area],
  );

  // Lejereserve — residential rental cases with a market rent + real area.
  const rentReserve = useMemo(() => {
    // A reserve only exists against a rent someone actually pays; our own
    // estimate compared with the benchmark says nothing.
    if (isInvestment || rentEstimated || !rentBenchSized || !area || area <= 10) return null;
    return computeRentReserve({
      currentMonthlyRent: inputs.monthlyRent,
      marketRentPerM2Month: rentBenchSized.value,
      areaM2: area,
      yearBuilt: byggeaar,
      zip,
      regionalCapRate: 5.0,
      propertyType: propType,
    });
  }, [isInvestment, rentEstimated, rentBenchSized, area, inputs.monthlyRent, byggeaar, zip, propType]);

  /* ---------- The story: one answer per question ---------- */
  const p1 = (n: number) => n.toLocaleString("da-DK", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const heroTone: Tone = displayScore >= 65 ? "good" : displayScore >= 45 ? "warn" : "bad";
  const heroHeadline =
    displayScore >= 80 ? "Stærk investering" : displayScore >= 65 ? "God investering" : displayScore >= 45 ? "Usikker investering" : "Svag investering";
  // A forældrekøb is judged against the child renting, not as an investment.
  const pv = goal === "parents" ? parentsView(inputs, r) : null;
  const heroScoreShown = pv ? Math.max(0, Math.min(100, Math.round(50 + (pv.familyRent > 0 ? (pv.vsRenting / pv.familyRent) * 50 : 0)))) : displayScore;
  const heroHeadlineShown = pv ? `${dk(Math.abs(pv.vsRenting))} kr. ${pv.vsRenting >= 0 ? "bedre" : "dyrere"} end leje` : heroHeadline;
  const investVerdict = r.cashFlow >= 0
    ? `Positivt cash flow på ${dk(r.cashFlow)} kr. pr. måned efter finansiering. ${r.dscr >= 1.25 ? "Rentebufferen er god." : "Rentebufferen er begrænset."}`
    : `Negativt cash flow på ${dk(Math.abs(r.cashFlow))} kr. pr. måned efter finansiering. Driftsresultatet dækker ikke ydelsen.`;
  const heroVerdictShown = isInvestment ? investVerdict : pv
    ? `${r.cashFlow >= 0 ? `Barnets husleje dækker alle udgifter og giver et overskud på ${dk(r.cashFlow)} kr. pr. måned.` : `Udgiften er ${dk(Math.abs(r.cashFlow))} kr. pr. måned ud over barnets husleje.`} Over ${pv.years} år bliver ${dk(pv.familyRent)} kr. i husleje i familien frem for at gå til en udlejer.`
    : displayVerdict;
  const heroToneShown: Tone = pv ? (pv.vsRenting >= 0 ? "good" : "bad") : heroTone;
  const heroNotes = [
    ...(inv?.note ? [inv.note.replace(" — ", ". ")] : []),
    ...(!isInvestment && rentEstimated ? ["Lejen er estimeret. Bekræft den, før du byder."] : []),
  ];
  // The standard names, each with a one-line note on what it measures.
  const heroMetrics: HeroMetric[] = [
    {
      label: "Cash flow pr. md.",
      value: `${r.cashFlow >= 0 ? "+" : "−"}${dk(Math.abs(r.cashFlow))}`,
      unit: "kr",
      tone: r.cashFlow >= 500 ? "good" : r.cashFlow >= 0 ? "warn" : "bad",
      note: "Efter finansiering og driftsudgifter",
    },
    { label: "Nettoafkast", value: num(r.capRate), unit: "%", tone: r.capRate >= 5 ? "good" : r.capRate >= 3.5 ? "warn" : "bad", note: "Årligt, før finansiering" },
    { label: "Kontantafkast", value: num(r.cashOnCash), unit: "%", tone: r.cashOnCash >= 8 ? "good" : r.cashOnCash >= 0 ? "warn" : "bad", note: `Af egenkapital på ${dk(r.cashInvested)} kr.` },
    { label: "Gældsdækning (DSCR)", value: num(r.dscr), tone: r.dscr >= 1.25 ? "good" : r.dscr >= 1 ? "warn" : "bad", note: r.dscr >= 1.25 ? "Bankerne kræver typisk 1,25" : r.dscr >= 1 ? "Under bankernes typiske krav på 1,25" : "Dækker ikke ydelsen" },
  ];

  // An investeringsejendom gets the four numbers an investor checks first.
  const investMetrics: HeroMetric[] = [
    { label: "Cash flow pr. md.", value: `${r.cashFlow >= 0 ? "+" : "−"}${dk(Math.abs(r.cashFlow))}`, unit: "kr", tone: r.cashFlow >= 0 ? "good" : "bad" },
    { label: "Nettoafkast", value: num(r.capRate), unit: "%", tone: inv && inv.score >= 62 ? "good" : inv && inv.score >= 45 ? "warn" : "bad" },
    { label: "Egenkapital", value: dk(r.cashInvested), unit: "kr", tone: "neutral", note: "Udbetaling og købsomkostninger" },
    { label: "Gældsdækning (DSCR)", value: num(r.dscr), tone: r.dscr >= 1.25 ? "good" : r.dscr >= 1 ? "warn" : "bad" },
  ];
  const heroMetricsShown: HeroMetric[] = isInvestment ? investMetrics : pv
    ? [
        { label: r.cashFlow >= 0 ? "Overskud pr. md." : "Udgift pr. md.", value: `${r.cashFlow >= 0 ? "+" : "−"}${dk(Math.abs(r.cashFlow))}`, unit: "kr", tone: r.cashFlow >= 0 ? "good" : "warn" },
        { label: "Forskel mod leje", value: `${pv.vsRenting >= 0 ? "+" : "−"}${dk(Math.abs(pv.vsRenting))}`, unit: "kr", tone: pv.vsRenting >= 0 ? "good" : "bad" },
        { label: "Husleje i familien", value: dk(pv.familyRent), unit: "kr", tone: "good" },
        { label: `Gevinst efter ${pv.years} år`, value: `${pv.afterTax >= 0 ? "+" : "−"}${dk(Math.abs(pv.afterTax))}`, unit: "kr", tone: pv.afterTax >= 0 ? "good" : "warn" },
      ]
    : heroMetrics;

  const cashAnswer: ChapterAnswer =
    r.cashFlow >= 0
      ? { tone: r.cashFlow >= 500 ? "good" : "warn", text: `Cash flow på +${dk(r.cashFlow)} kr. pr. måned` }
      : { tone: "bad", text: `Cash flow på −${dk(Math.abs(r.cashFlow))} kr. pr. måned` };

  const priceDelta = priceBench && propertyPriceM2 ? ((propertyPriceM2 - priceBench.value) / priceBench.value) * 100 : null;
  const showPriceChapter = !isInvestment && (!!priceBench || !!rentBench || (!!zip && !!area && area > 10));
  // Say what the price is compared with: a regional median for the type, not
  // this street.
  const PLURAL: Record<string, string> = { condo: "ejerlejligheder", cooperative: "andelsboliger", "villa apartment": "villalejligheder", "terraced house": "rækkehuse", villa: "villaer", "holiday house": "sommerhuse", farm: "landejendomme" };
  const bench = priceBench as (typeof priceBench & { type?: string; scope?: string }) | null;
  const benchScope = bench
    ? `medianen for ${bench.scope === "region-type" && bench.type ? PLURAL[bench.type] ?? "boliger" : "boliger"} i ${bench.regionLabel}`
    : "markedet";
  const priceAnswer: ChapterAnswer =
    priceDelta == null
      ? { tone: "neutral", text: "Sammenlign med lignende boliger" }
      : priceDelta <= -3
      ? { tone: "good", text: `${Math.round(Math.abs(priceDelta))} % under ${benchScope} pr. m²` }
      : priceDelta <= 3
      ? { tone: "good", text: `På niveau med ${benchScope} pr. m²` }
      : priceDelta <= 15
      ? { tone: "warn", text: `${Math.round(priceDelta)} % over ${benchScope} pr. m²` }
      : { tone: "bad", text: `${Math.round(priceDelta)} % over ${benchScope} pr. m²` };

  const headroom = Number.isFinite(r.breakEvenRate) ? r.breakEvenRate - inputs.interestRate : 0;
  const riskAnswer: ChapterAnswer =
    headroom >= 2
      ? { tone: "good", text: `Rentebuffer på ${p1(headroom)} procentpoint` }
      : headroom >= 0
      ? { tone: "warn", text: `Lille rentebuffer: ${p1(headroom)} procentpoint` }
      : { tone: "bad", text: "Negativt cash flow ved den valgte rente" };

  const potentialAnswer: ChapterAnswer =
    rentReserve?.verdict === "reserve"
      ? { tone: "good", text: `Lejereserve på ${dk(rentReserve.realisticMonthlyUplift)} kr. pr. måned` }
      : rentReserve?.verdict === "over-market"
      ? { tone: "warn", text: "Lejen er over markedsniveau. Risiko ved genudlejning" }
      : { tone: "neutral", text: "Beregn istandsættelse og værdiforøgelse" };

  const futureAnswer: ChapterAnswer =
    r.totalProfit > 0
      ? {
          tone: Number.isFinite(r.irr) && r.irr >= 8 ? "good" : "warn",
          text: `+${dk(r.totalProfit)} kr. efter ${r.holdYears} år${Number.isFinite(r.irr) ? `, IRR ${num(r.irr)} %` : ""}`,
        }
      : { tone: "bad", text: `${dk(r.totalProfit)} kr. efter ${r.holdYears} år` };

  const docCount = provenanceRows.filter((row) => row.tier === "doc").length;
  const dataShare = provenanceRows.length ? docCount / provenanceRows.length : 0;
  const dataAnswer: ChapterAnswer = {
    tone: dataShare >= 0.6 ? "good" : dataShare >= 0.3 ? "warn" : "bad",
    text: `${docCount} af ${provenanceRows.length} nøgletal er dokumenterede`,
  };

  const navItems: NavItem[] = isInvestment ? [
    { id: "overblik", label: "Overblik", tone: heroTone },
    { id: "oekonomi", label: "Økonomi", tone: r.cashFlow >= 0 ? "good" : "bad" },
    { id: "risici", label: "Rente", tone: riskAnswer.tone },
    { id: "fremtid", label: "10 år", tone: r.totalProfit >= 0 ? "good" : "bad" },
    { id: "tjek", label: "Tjekliste", tone: "neutral" },
    { id: "data", label: "Datagrundlag", tone: "neutral" },
  ] : [
    { id: "overblik", label: "Overblik", tone: heroTone },
    ...(isInvestment ? [] : [{ id: "kalkule", label: "Beregning", tone: (r.cashFlow >= 0 ? "good" : "bad") as Tone }]),
    { id: "oekonomi", label: "Økonomi", tone: cashAnswer.tone },
    ...(showPriceChapter ? [{ id: "pris", label: "Pris", tone: priceAnswer.tone }] : []),
    { id: "risici", label: "Risici", tone: riskAnswer.tone },
    { id: "potentiale", label: "Potentiale", tone: potentialAnswer.tone },
    { id: "fremtid", label: "Fremskrivning", tone: futureAnswer.tone },
    { id: "data", label: "Datagrundlag", tone: dataAnswer.tone },
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
    if (!supabase) { window.location.href = "/auth/login?next=/app/analyser"; return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/auth/login?next=/app/analyser"; return; }
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

  /** Saves the property to the pipeline (once) and returns its id. */
  const saveToPortfolio = async (): Promise<string | null> => {
    if (save.status === "saved" && save.id) return save.id;
    const supabase = await loadSupabase();
    if (!supabase) {
      window.location.href = "/auth/login?next=/app/analyser";
      return null;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/auth/login?next=/app/analyser";
      return null;
    }
    setSave({ status: "saving" });
    // No quota check here anymore: the monthly limit is now enforced on the
    // analysis run itself (the paywall). Saving only flips an already-counted
    // row to saved_to_portfolio, so it must never be blocked.
    const payload = {
      user_id: user.id,
      property_url: address ?? null,
      property_data: { ...inputs, address, listingUrl, propType, zip, area, goal, image: images[0] } as Record<string, unknown>,
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
    let id: string | undefined;
    // A property saved for the first time starts its case in the chosen stage.
    const newCase: Mappe = { ...EMPTY_MAPPE, stage: saveStage, log: [{ at: new Date().toISOString(), text: "Gemt fra analysen", kind: "oprettet" }] };
    payload.property_data.mappe = newCase;
    if (usageRowIdRef.current) {
      // Keep an existing ejendomsmappe (property_data.mappe) when saving again.
      // Keep what the row already knows (the mappe, the listing link, the type)
      // when this session doesn't have it.
      const prev = await supabase.from("analyses").select("property_data").eq("id", usageRowIdRef.current).single();
      const old = (prev.data?.property_data ?? {}) as Record<string, unknown>;
      const fresh = Object.fromEntries(Object.entries(payload.property_data).filter(([, v]) => v != null && v !== ""));
      payload.property_data = { ...old, ...fresh, mappe: (old.mappe as Mappe | undefined) ?? newCase };
      const res = await supabase.from("analyses").update(payload).eq("id", usageRowIdRef.current).eq("user_id", user.id);
      error = res.error;
      if (!error) id = usageRowIdRef.current;
    }
    if (!usageRowIdRef.current || error) {
      const res = await supabase.from("analyses").insert(payload).select("id").single();
      error = res.error;
      id = res.data?.id;
    }
    if (error) { setSave({ status: "error", msg: error.message }); return null; }
    setSave({ status: "saved", id });
    return id ?? null;
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
            <Field label="Købsomkostninger" name="acqCostPct" value={inputs.acqCostPct} onChange={(n) => { setAcqTouched(true); set({ acqCostPct: n }); }} suffix="%" step={0.5} />
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
      <section aria-label="Regn selv" className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1080px]">
          <div className="max-w-[560px] rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            {form}
            <button
              type="button"
              onClick={() => { setRan(true); window.scrollTo({ top: 0 }); }}
              className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-blue-600 px-6 text-[16px] font-semibold text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 active:translate-y-px"
            >
              Analysér ejendommen
            </button>
          </div>
        </div>
      </section>
    );
  }

  const navTitle = address ? address.split(",")[0] : "Din analyse";
  // ---- The analysis workspace (inside the app) ----
  const TONE_ICON = { good: CheckCircle2, warn: AlertTriangle, bad: XCircle, neutral: Info } as const;
  const answers: { id: string; q: string; a: ChapterAnswer }[] = [
    { id: "kalkule", q: "Cash flow", a: cashAnswer },
    ...(showPriceChapter ? [{ id: "pris", q: "Pris mod markedet", a: priceAnswer }] : []),
    { id: "risici", q: "Rentefølsomhed", a: riskAnswer },
    { id: "potentiale", q: "Lejereserve og potentiale", a: potentialAnswer },
    { id: "fremtid", q: `Afkast over ${r.holdYears} år`, a: futureAnswer },
    { id: "data", q: "Datagrundlag", a: dataAnswer },
  ];
  const tabs = [
    { id: "overblik", label: "Overblik", tone: heroTone },
    { id: "kalkule", label: "Beregning", tone: cashAnswer.tone },
    ...(showPriceChapter ? [{ id: "pris", label: "Pris", tone: priceAnswer.tone }] : []),
    { id: "risici", label: "Risici", tone: riskAnswer.tone },
    { id: "potentiale", label: "Potentiale", tone: potentialAnswer.tone },
    { id: "fremtid", label: `${r.holdYears} år`, tone: futureAnswer.tone },
    { id: "data", label: "Datagrundlag", tone: dataAnswer.tone },
  ];
  const show = (id: string) => tab === id;
  const openTab = (id: string) => {
    setTab(id);
    const bar = document.getElementById("analyse-tabs");
    if (bar && bar.getBoundingClientRect().top < 64) window.scrollTo({ top: window.scrollY + bar.getBoundingClientRect().top - 72 });
  };
  const tabBar = (
    <div id="analyse-tabs" className="sticky top-16 z-20 -mx-4 flex items-center gap-2 border-b border-slate-200 bg-slate-50/95 px-4 py-1.5 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:bg-white/95 sm:px-1.5">
      <nav aria-label="Analysens dele" role="tablist" className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto [scrollbar-width:none]">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => openTab(t.id)}
            className={clsx("inline-flex min-h-[38px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-[14px] font-semibold transition-colors", tab === t.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")}>
            {t.id !== "overblik" && <span aria-hidden className={clsx("h-1.5 w-1.5 rounded-full", t.tone === "good" ? "bg-emerald-500" : t.tone === "warn" ? "bg-amber-500" : t.tone === "bad" ? "bg-rose-500" : "bg-slate-400")} />}
            {t.label}
          </button>
        ))}
      </nav>
      <button type="button" onClick={() => setSheetOpen(true)} className="hidden min-h-[38px] shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-800 hover:border-slate-300 sm:inline-flex"><SlidersHorizontal size={14} /> Justér tallene</button>
    </div>
  );
  const overviewTab = (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-5 py-3.5 text-[16px] font-semibold text-slate-900">Vurdering</h2>
        <ul className="divide-y divide-slate-100">
          {answers.map(({ id, q, a }) => {
            const Icon = TONE_ICON[a.tone];
            return (
              <li key={id}>
                <button type="button" onClick={() => openTab(id)} className="group flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50">
                  <Icon aria-hidden size={19} className={clsx("shrink-0", toneNum[a.tone])} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-slate-900">{q}</span>
                    <span className={clsx("block text-[14px] font-medium", toneNum[a.tone])}>{a.text}</span>
                  </span>
                  <ChevronRight aria-hidden size={17} className="shrink-0 text-slate-300 group-hover:text-slate-600" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-[16px] font-semibold text-slate-900">Månedligt budget</h2>
        <div className="mt-4">
          <MoneyFlow rent={r.annualRent / 12} vacancy={r.opex.vacancy / 12} maintenance={r.opex.maintenance / 12} fixed={r.opex.fixed / 12} mortgage={r.monthlyMortgage} cashFlow={r.cashFlow} />
        </div>
      </section>
    </div>
  );

  // Save first (once), then do the next step on the saved case.
  const plan = async (kind: "fremvisning" | "andet" | "bank") => {
    const id = await saveToPortfolio();
    if (id) setPlanFor({ rowId: id, kind });
  };
  const goCase = async (fane: string) => {
    const id = await saveToPortfolio();
    if (id) window.location.href = `/app/ejendomme/${id}?fane=${fane}`;
  };
  const lightBtn = "flex min-h-[42px] w-full items-center gap-2.5 rounded-lg px-3 text-left text-[14px] font-semibold text-slate-800 transition-colors hover:bg-slate-100 disabled:opacity-60";
  const actionPanel = (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        {save.status === "saved" ? (
          <>
            <p className="flex items-center gap-2 text-[15px] font-semibold text-emerald-700"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white"><Check aria-hidden size={14} strokeWidth={3} /></span> Gemt i pipeline</p>
            <p className="mt-1 text-[13px] text-slate-500">Opgaver, bud og noter gemmes på sagen.</p>
            <a href={save.id ? `/app/ejendomme/${save.id}` : "/app/ejendomme"} className="mt-3 inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 text-[14px] font-semibold text-white hover:bg-slate-800">Åbn sagen <ArrowRight aria-hidden size={15} /></a>
          </>
        ) : (
          <>
            <p className="text-[15px] font-semibold text-slate-900">Gem i pipeline</p>
            <p className="mt-0.5 text-[13px] text-slate-500">Ejendommen gemmes med analysens tal.</p>
            <div className="mt-3 flex gap-2">
              <label className="sr-only" htmlFor="save-stage">Fase</label>
              <select id="save-stage" value={saveStage} onChange={(e) => setSaveStage(e.target.value as Stage)} className="h-[42px] min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-[14px] font-medium text-slate-800">
                {STAGES.filter((x) => x.id !== "koebt").map((x) => <option key={x.id} value={x.id}>{STAGE_LABEL[x.id]}</option>)}
              </select>
              <button type="button" onClick={() => void saveToPortfolio()} disabled={save.status === "saving"} className="inline-flex min-h-[42px] shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-[14px] font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
                {save.status === "saving" ? <Loader2 aria-hidden size={15} className="animate-spin" /> : <Bookmark aria-hidden size={15} />} Gem
              </button>
            </div>
            {save.status === "error" && <p role="alert" className="mt-2 text-[13px] font-medium text-rose-600">Kunne ikke gemme. Prøv igen.</p>}
          </>
        )}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-2">
        <p className="px-3 pb-1 pt-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">Næste skridt</p>
        <button type="button" onClick={() => plan("fremvisning")} disabled={save.status === "saving"} className={lightBtn}><CalendarPlus aria-hidden size={16} className="text-sky-600" /> Planlæg fremvisning</button>
        <button type="button" onClick={() => plan("andet")} disabled={save.status === "saving"} className={lightBtn}><ListPlus aria-hidden size={16} className="text-slate-500" /> Opret opgave</button>
        <button type="button" onClick={() => goCase("bud")} disabled={save.status === "saving"} className={lightBtn}><Gavel aria-hidden size={16} className="text-orange-600" /> Registrér bud</button>
        <button type="button" onClick={() => goCase("papirer")} disabled={save.status === "saving"} className={lightBtn}><Upload aria-hidden size={16} className="text-amber-600" /> Gennemgå salgsdokumenter</button>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-2">
        <p className="px-3 pb-1 pt-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">Del og eksportér</p>
        <button type="button" onClick={() => requirePaid("report", openBankReport)} className={lightBtn}><FileText aria-hidden size={16} className="text-blue-600" /> Bankrapport (PDF)</button>
        <button type="button" onClick={() => requirePaid("excel", exportExcel)} disabled={exporting} className={lightBtn}>{exporting ? <Loader2 aria-hidden size={16} className="animate-spin" /> : <FileSpreadsheet aria-hidden size={16} className="text-emerald-600" />} {exporting ? "Eksporterer…" : "Eksportér til Excel"}</button>
        {listingUrl && (watch.status === "saved"
          ? <p className={clsx(lightBtn, "text-emerald-700 hover:bg-transparent")}><BellRing aria-hidden size={16} /> Prisvagt aktiv</p>
          : <button type="button" onClick={startWatch} disabled={watch.status === "saving"} className={lightBtn}>{watch.status === "saving" ? <Loader2 aria-hidden size={16} className="animate-spin" /> : <Bell aria-hidden size={16} className="text-slate-500" />} Giv besked ved prisfald</button>)}
        <ShareAnalysis className={lightBtn} title={address ? `Analyse af ${address.split(",")[0]}` : "Analyse af ejendommen"}
          params={{ url: urlParam, addr: address, price: inputs.price, rent: inputs.monthlyRent, opex: inputs.monthlyOpex, downPaymentPct: inputs.downPaymentPct, interestRate: inputs.interestRate }} />
        {watch.status === "error" && <p role="alert" className="px-3 pb-2 text-[13px] font-medium text-rose-600">Prisvagten kunne ikke startes.</p>}
      </section>
      <button type="button" onClick={() => setSheetOpen(true)} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-[14px] font-semibold text-slate-800 hover:border-slate-300 sm:hidden"><SlidersHorizontal size={15} /> Justér tallene</button>
    </>
  );

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

          {journeyNote && (
            <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
              <p className="mx-auto max-w-[1080px] text-[14px] text-slate-600">
                <span className="font-semibold text-slate-900">Tilpasset din strategi:</span> {journeyNote}.{" "}
                <button type="button" onClick={() => setSheetOpen(true)} className="font-medium text-blue-700 underline underline-offset-2">Ret tallene</button>
              </p>
            </div>
          )}

          <div className="mx-auto max-w-[1280px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="min-w-0 lg:col-start-1 lg:row-start-1">
                <AppHero
                  images={images}
                  address={address}
                  score={heroScoreShown}
                  headline={heroHeadlineShown}
                  verdict={heroVerdictShown}
                  tone={heroToneShown}
                  notes={heroNotes}
                  metrics={heroMetricsShown}
                  probability={isInvestment ? null : { pct: Math.round(uncertainty.pCashFlowPositive * 100), runs: uncertainty.runs }}
                  listingUrl={listingUrl}
                  sourceLabel={sourceName(listingUrl)}
                  kindLabel={isInvestment ? `Erhverv${subcatParam ? `, ${subcatParam}` : ""}` : goal === "parents" ? "Forældrekøb" : `Udlejning, ${(strategies.find((x) => x.id === inputs.strategy)?.label ?? "").toLowerCase()}`}
                />
              </div>
              <aside className="lg:col-start-2 lg:row-start-1 lg:row-span-2">
                <div className="space-y-4 lg:sticky lg:top-20">{actionPanel}</div>
              </aside>
              <div className="min-w-0 lg:col-start-1 lg:row-start-2">
                {isInvestment ? (
                  <div className="-mx-4 sm:-mx-6 lg:mx-0 lg:overflow-hidden lg:rounded-2xl lg:border lg:border-slate-200">
            <ChapterNav items={navItems} title={navTitle} onAdjust={() => setSheetOpen(true)} />
            <CommercialStory
              r={r}
              price={inputs.price}
              rate={inputs.interestRate}
              termYears={inputs.termYears ?? 30}
              subcategory={subcatParam}
              appreciationPct={inputs.appreciationPct ?? 2}
              address={address}
              onAdjust={() => setSheetOpen(true)}
              trust={<DataProvenance rows={provenanceRows} rentRule={rentRule} showRentCaveat={false} />}
            />
                  </div>
                ) : (
                  <>
                    {tabBar}
                    <div className="mt-4 space-y-5">
                      {show("overblik") && overviewTab}

          {show("kalkule") && (
            <section id="kalkule" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div>
                <h2 className="text-[20px] font-semibold tracking-[-0.02em] sm:text-[22px]">Beregning</h2>
                <p className="mt-1 max-w-2xl text-[15px] text-slate-600">
                  {goal === "parents"
                    ? "Forældrekøbet fra købspris til resultat ved salg. Ret et blåt felt, så opdateres beregningen."
                    : <>Den fulde beregning.<span className="hidden sm:inline"> Ret et blåt felt, så opdateres beregningen. Klik på en række for at se udregningen.</span></>}
                </p>
                {/* Phones: the month as a short receipt; the 29-line sheet is one tap away. */}
                <div className="mt-6 sm:hidden">
                  <MonthReceipt r={r} rent={inputs.monthlyRent} fixed={inputs.monthlyOpex} child={goal === "parents"} />
                  <button type="button" onClick={() => setFullSheet((v) => !v)} aria-expanded={fullSheet}
                    className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-[16px] font-semibold text-slate-900 active:translate-y-px">
                    {fullSheet ? "Skjul den fulde beregning" : "Vis den fulde beregning"} <ChevronDown aria-hidden size={18} className={fullSheet ? "rotate-180" : ""} />
                  </button>
                </div>
                <div className={fullSheet ? "mt-6" : "mt-6 hidden sm:block"}>
                  <RentalSheet
                    inputs={inputs}
                    r={r}
                    set={set}
                    goal={goal}
                    rentEstimated={rentEstimated}
                    marketRent={zip && area && area > 10 ? estimateMonthlyRent(zip, area, cal.rentFactor || 1) : null}
                    acqTouched={acqTouched}
                    onExport={exportExcel}
                    exporting={exporting}
                  />
                </div>
              </div>
            </section>
          )}

          {show("kalkule") && (
          <Chapter flat id="oekonomi" question="Cash flow" answer={cashAnswer}>
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
              <h3 className="text-[21px] font-semibold tracking-[-0.02em] text-slate-900">Nøgletal</h3>
              <p className="mt-1 text-[15px] text-slate-500">Klik på spørgsmålstegnet for en forklaring.</p>
              <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-7 md:grid-cols-4">
                <KeyStat
                  label="Cash flow pr. md." value={dk(r.cashFlow)} unit="kr" tone={cfTone}
                  sub={r.cashFlow >= 0 ? `+${dk(r.annualCashFlow)} kr. pr. år` : `−${dk(Math.abs(r.annualCashFlow))} kr. pr. år`}
                  explain="Lejeindtægt fratrukket driftsudgifter og ydelse på lån. Negativt cash flow skal dækkes af egne midler."
                  how="Månedlig leje − driftsudgifter − ydelse på lån."
                />
                <KeyStat
                  label="Nettoafkast" value={num(r.capRate)} unit="%"
                  tone={r.capRate >= 5 ? "text-emerald-600" : r.capRate >= 3 ? "text-slate-900" : "text-rose-600"}
                  sub="Årligt, før finansiering"
                  explain={`Driftsresultatet i procent af købsprisen. Viser ejendommens afkast uafhængigt af finansieringen.`}
                  how="Driftsresultat (leje − tomgang, vedligehold og faste udgifter) / købspris."
                />
                <KeyStat
                  label="Kontantafkast" value={num(r.cashOnCash)} unit="%"
                  tone={r.cashOnCash >= 8 ? "text-emerald-600" : r.cashOnCash >= 0 ? "text-slate-900" : "text-rose-600"}
                  sub={`Af egenkapital på ${dk(r.cashInvested)} kr.`}
                  explain={`Årligt cash flow i procent af egenkapitalen (udbetaling og købsomkostninger). Her ${dk(r.annualCashFlow)} kr. af ${dk(r.cashInvested)} kr.`}
                  how="Årligt cash flow / egenkapital."
                />
                <KeyStat
                  label="Gældsdækning" value={num(r.dscr)} tone={dscrTone}
                  sub={r.dscr >= 1.25 ? "Over bankernes typiske krav" : r.dscr >= 1 ? "Under bankernes typiske krav" : "Dækker ikke ydelsen"}
                  explain={`Driftsresultatet i forhold til ydelsen på lånet. 1,0 betyder, at driftsresultatet netop dækker ydelsen. Banker kræver typisk mindst 1,25.`}
                  how="Driftsresultat (NOI) / årlig ydelse på lån."
                />
                <KeyStat
                  label="Bruttoafkast" value={num(r.grossYield)} unit="%"
                  sub="Før udgifter"
                  explain="Årlig leje i procent af købsprisen, før driftsudgifter. Nettoafkastet er mere retvisende, fordi det fratrækker udgifterne."
                  how="Årlig leje / købspris."
                />
                <KeyStat
                  label={`IRR over ${r.holdYears} år`} value={num(r.irr)} unit="%"
                  tone={isFinite(r.irr) && r.irr >= 8 ? "text-emerald-600" : "text-slate-900"}
                  sub="Cash flow og værdistigning"
                  explain="Den årlige forrentning af egenkapitalen over hele ejerperioden, inklusive cash flow og værdistigning. Over 8-10 % regnes som stærkt."
                  how="Den interne rente af alle betalinger: egenkapital ved køb, årligt cash flow og nettoprovenu ved salg."
                />
                <KeyStat
                  label="Equity multiple" value={num(r.equityMultiple)} unit="x"
                  sub="Samlet udbetaling pr. investeret krone"
                  explain={`Hvor mange gange egenkapitalen kommer retur over perioden. ${num(r.equityMultiple)}x betyder ${num(r.equityMultiple)} kr. retur pr. investeret krone.`}
                  how="(Samlet cash flow + nettoprovenu ved salg) / egenkapital."
                />
                <KeyStat
                  label="Break-even belægning" value={num(r.breakEvenOccupancy, 0)} unit="%"
                  sub="Lavere giver større buffer"
                  explain={`Den udlejningsgrad, hvor cash flow er nul. Ved ${num(r.breakEvenOccupancy, 0)} % udlejning dækker lejen præcis lån og udgifter. Over 100 % betyder, at lejen ikke dækker, selv ved fuld udlejning.`}
                  how="(Driftsudgifter + ydelse på lån) / lejeindtægt ved fuld udlejning."
                />
              </div>
            </Panel>
            <Details label="driftsbudget, finansiering og usikkerhed">
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
                    <div className="border-t border-slate-100 pt-2.5"><Row l="Egenkapital" v={kr(r.cashInvested)} strong /></div>
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
          )}

          {showPriceChapter && show("pris") && (
            <Chapter flat id="pris" question="Pris mod markedet" answer={priceAnswer}>
              <Valuation bfe={bfe} price={inputs.price} />
              {(priceBench || rentBench) && (
                <div className="grid gap-5 md:grid-cols-2">
                  {priceBench && propertyPriceM2 && (
                    <MarketBenchmark propertyPriceM2={propertyPriceM2} benchmark={priceBench} />
                  )}
                  {rentBench && (
                    <RentBenchmark
                      benchmark={rentBenchSized ?? rentBench}
                      currentRent={inputs.monthlyRent}
                      region={rentBench.region}
                      type={rentBench.type}
                      analysisId={usageRowIdRef.current}
                      areaM2={area}
                      estimated={rentEstimated}
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

          {show("risici") && (
          <Chapter flat id="risici" question="Risici" answer={riskAnswer}>
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
          )}

          {show("potentiale") && (
          <Chapter flat id="potentiale" question="Lejereserve og potentiale" answer={potentialAnswer}>
            {rentReserve && <RentReserve reserve={rentReserve} />}
            {listingUrl && (
              <Link
                href={`/app/analyser?strategi=1&url=${encodeURIComponent(listingUrl)}`}
                className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-blue-300"
              >
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold text-slate-900">Renovering og videresalg</span>
                  <span className="block text-[14px] text-slate-600">Flip-analysen beregner værdi efter renovering, renoveringsbudget, skat og maksimalt bud.</span>
                </span>
                <span className="shrink-0 text-[14px] font-semibold text-blue-700">Åbn flip-analyse →</span>
              </Link>
            )}
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
          )}

          {show("fremtid") && (
          <Chapter flat id="fremtid" question={`Afkast over ${r.holdYears} år`} answer={futureAnswer}>
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
          )}

          {show("data") && (
          <Chapter flat id="data" question="Datagrundlag" answer={dataAnswer}>
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
          )}
                      {show("data") && (
              <div className="space-y-4">
                {analysisLogged && !tsHidden && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                    <TimeSavingsCapture onSubmit={submitTimeSavings} onDismiss={() => setTsHidden(true)} />
                  </div>
                )}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
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
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div id="analyse-end" aria-hidden className="h-px" />
            <UpgradeDialog reason={upgrade} onClose={() => setUpgrade(null)} />
          </div>

        </>
      )}

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Justér tallene"
        description="Analysen opdateres, når du ændrer et tal."
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

      <EventDialog state={planFor} onClose={() => setPlanFor(null)} homes={save.id ? [{ id: save.id, address: address ?? "Boligen" }] : []}
        onSave={async (d) => { if (!d.rowId) return false; const ok = await addTaskToRow(d.rowId, toTask({ ...d, id: `t${Date.now()}` }), `${d.title} planlagt`); if (ok) setActionMsg("Aftalen er gemt i kalenderen og på sagen."); return ok; }} />
      {actionMsg && <Toast text={actionMsg} onClose={() => setActionMsg(null)} />}

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



/** The month in five lines, for phones: rent in, costs and loan out, what is left. */
function MonthReceipt({ r, rent, fixed, child }: { r: AnalysisResult; rent: number; fixed: number; child: boolean }) {
  const k = (n: number) => `${Math.round(Math.abs(n)).toLocaleString("da-DK")} kr.`;
  const upkeep = (r.opex.vacancy + r.opex.maintenance) / 12;
  const rows: [string, number][] = [
    [child ? "Barnets husleje" : "Lejeindtægt", rent],
    ["Ydelse på lån", -r.monthlyMortgage],
    ["Ejerudgift og faste udgifter", -fixed],
    ["Vedligehold og tomgang", -upkeep],
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <dl className="px-5 pt-4 text-[16px]">
        {rows.filter(([, v]) => Math.round(v) !== 0).map(([label, v]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 py-2">
            <dt className="text-slate-700">{label}</dt>
            <dd className={`shrink-0 font-semibold tabular-nums ${v > 0 ? "text-emerald-700" : "text-slate-500"}`}>{v > 0 ? "+" : "−"}{k(v)}</dd>
          </div>
        ))}
        <div className="mt-1.5 flex items-baseline justify-between gap-4 border-t-2 border-slate-900 py-3">
          <dt className="text-[17px] font-semibold text-slate-900">Cash flow pr. måned</dt>
          <dd className={`shrink-0 text-[19px] font-bold tabular-nums ${r.cashFlow >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{r.cashFlow >= 0 ? "+" : "−"}{k(r.cashFlow)}</dd>
        </div>
      </dl>
      <dl className="grid grid-cols-2 divide-x divide-slate-200 border-t border-slate-200 bg-slate-50/70">
        <div className="min-w-0 px-5 py-3.5">
          <dt className="text-[13px] text-slate-500">Egenkapital</dt>
          <dd className="mt-0.5 text-[16px] font-semibold tabular-nums text-slate-900">{k(r.cashInvested)}</dd>
        </div>
        <div className="min-w-0 px-5 py-3.5">
          <dt className="text-[13px] text-slate-500">Gevinst efter {r.holdYears} år</dt>
          <dd className={`mt-0.5 text-[16px] font-semibold tabular-nums ${r.totalProfit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{r.totalProfit >= 0 ? "+" : "−"}{k(r.totalProfit)}</dd>
        </div>
      </dl>
    </div>
  );
}

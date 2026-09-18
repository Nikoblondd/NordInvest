"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { Loader2, CheckCircle2, AlertCircle, FileSpreadsheet, ChevronDown, HelpCircle, X, Bookmark, Check, FileText, Bell, BellRing, ExternalLink } from "lucide-react";
import { analyze, kr, krMd, pct, num, type Strategy } from "@/lib/analysis";
import { runUncertainty } from "@/lib/uncertainty";
import { assessInvestment } from "@/lib/deals";
import { ConfidenceBands } from "@/components/analyzer/ConfidenceBands";
import { Button } from "@/components/ui/Button";
import { clsx } from "@/lib/clsx";
import { createClient } from "@/lib/supabase/client";
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
import type { RentBenchmark as RentBench } from "@/lib/rent";
import { PaywallGate } from "@/components/analyzer/PaywallGate";
import { TimeSavingsCapture } from "@/components/analyzer/TimeSavingsCapture";
import { captureEvent } from "@/lib/analytics-events";
import { buildProvenance, rentRegulationRule } from "@/lib/provenance";
import type { PriceBenchmark } from "@/lib/reference";

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

// Section separator styled like a spreadsheet tab-header — small alt-caps
// label with a right-side hint, plus a subtle hairline below. Groups the
// results into named zones (Vurdering · Marked · Datagrundlag · Prognose ·
// Værktøjer) so an investor can scan the analysis the way they scan the
// tabs of an Excel model instead of a wall of cards.
function ZoneHeader({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-3 pt-2">
      <div className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      {hint && (
        <div className="hidden min-w-0 flex-1 truncate text-[11px] text-slate-400 sm:block">
          {hint}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, suffix, step = 1 }: {
  label: string; value: number; onChange: (n: number) => void; suffix: string; step?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="mt-1 flex items-center rounded-xl border border-slate-200 bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
        <input type="number" value={value} step={step} onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-xl bg-transparent px-3 py-2.5 font-semibold text-slate-900 tnum outline-none" />
        <span className="px-3 text-sm text-slate-400">{suffix}</span>
      </div>
    </label>
  );
}

// A single quiet metric: label, big number, optional inline explanation. No box,
// no border — grouping comes from whitespace, keeping the results calm and scannable.
function KeyStat({
  label, value, unit = "", tone = "text-slate-900", explain, how,
}: {
  label: string; value: string; unit?: string; tone?: string; explain?: string; how?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="group relative min-w-0">
      <div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
        <span className="truncate">{label}</span>
        {explain && (
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Forklar"
            className="shrink-0 text-slate-300 opacity-50 transition-colors hover:text-blue-600 group-hover:opacity-100"
          >
            <HelpCircle size={12} />
          </button>
        )}
      </div>
      <div className={clsx("mt-1.5 flex items-baseline gap-1 font-bold leading-none tnum", tone)}>
        <span className="truncate text-xl sm:text-2xl md:text-[26px]">{value}</span>
        {unit && <span className="text-sm font-semibold text-slate-400">{unit}</span>}
      </div>

      {open && explain && (
        <div className="absolute left-0 top-full z-30 mt-2 w-64 max-w-[80vw] rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xl shadow-slate-900/10">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-slate-900">{label}</div>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700"><X size={15} /></button>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{explain}</p>
          {how && (
            <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
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
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [address, setAddress] = useState<string | null>(null);
  const [ran, setRan] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [details, setDetails] = useState(false);
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
      const supabase = createClient();
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
            ? "Denne bolig er ikke længere aktiv på Boligsiden. Indtast tallene manuelt herunder — analysen er lige så præcis."
            : err === "invalid_url"
            ? "Linket ser ikke rigtigt ud. Kopier hele URL'en fra boligsiden og prøv igen."
            : err.startsWith("fetch_")
            ? "Siden blokerede vores hentning. Indtast tallene manuelt herunder — analysen er lige så præcis."
            : "Kunne ikke hente data automatisk fra dette link. Indtast tallene manuelt herunder — analysen er lige så præcis.";
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
  const scoreBar = displayScore >= 65 ? "bg-emerald-500" : displayScore >= 45 ? "bg-blue-500" : "bg-rose-400";

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

  const chartData = r.projection.map((y) => ({ year: y.year, Friværdi: y.equity, "Kumuleret cash flow": y.cumulativeCashFlow }));

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
    const supabase = createClient();
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
    const supabase = createClient();
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
    const supabase = createClient();
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

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-8">
      {/* INPUT PANEL */}
      <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:sticky lg:top-24 lg:self-start">
        <h2 className="text-xl font-bold">Ejendommens tal</h2>
        <p className="mt-1 text-sm text-slate-500">Indsæt et boliglink på forsiden, eller ret tallene her.</p>

        {ex.status !== "idle" && (
          <div className={clsx("mt-4 flex items-start gap-2 rounded-xl border p-3 text-xs",
            ex.status === "loading" && "border-blue-200 bg-blue-50 text-blue-800",
            ex.status === "ok" && "border-emerald-200 bg-emerald-50 text-emerald-800",
            ex.status === "fail" && "border-amber-200 bg-amber-50 text-amber-800")}>
            {ex.status === "loading" ? <Loader2 size={15} className="mt-0.5 shrink-0 animate-spin" />
              : ex.status === "ok" ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
              : <AlertCircle size={15} className="mt-0.5 shrink-0" />}
            <span>
              {ex.status === "loading" && ex.stage}
              {ex.status === "ok" && (
                <>Hentet fra annoncen: <b>{(ex.found ?? []).filter((k) => FIELD_LABELS[k]).map((k) => FIELD_LABELS[k]).join(", ") || "grunddata"}</b>
                  {ex.estimated && ex.estimated.length > 0 && <> · estimeret: {ex.estimated.join(", ")}</>}. Ret gerne tallene.</>
              )}
              {ex.status === "fail" && ex.msg}
            </span>
          </div>
        )}

        <div className="mt-6 space-y-5">
          {/* Grouped like a spreadsheet: Ejendom → Finansiering → Drift.
              Tiny headers give the panel a mental scan-order instead of a
              flat list of a dozen fields. */}
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Ejendom</div>
            <div className="space-y-3">
              <Field label="Købspris" value={inputs.price} onChange={(n) => set({ price: n })} suffix="kr" step={25000} />
              <Field label={isInvestment ? "Driftsindtægt/md. (netto)" : "Månedlig leje"} value={inputs.monthlyRent} onChange={(n) => set({ monthlyRent: n })} suffix="kr/md." step={500} />
            </div>
          </div>
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Finansiering</div>
            <div className="space-y-3">
              <Field label="Udbetaling" value={inputs.downPaymentPct} onChange={(n) => set({ downPaymentPct: n })} suffix="%" />
              <Field label="Rente" value={inputs.interestRate} onChange={(n) => set({ interestRate: n })} suffix="% p.a." step={0.25} />
            </div>
          </div>
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Drift</div>
            <div className="space-y-3">
              <Field label="Faste udgifter" value={inputs.monthlyOpex} onChange={(n) => set({ monthlyOpex: n })} suffix="kr/md." step={250} />
            </div>
          </div>
        </div>

        <button onClick={() => setAdvanced((v) => !v)} className="mt-5 flex w-full items-center justify-between text-sm font-medium text-slate-600 hover:text-slate-900">
          Avancerede antagelser
          <ChevronDown size={16} className={clsx("transition-transform", advanced && "rotate-180")} />
        </button>
        {advanced && (
          <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
            <Field label="Løbetid" value={inputs.termYears} onChange={(n) => set({ termYears: n })} suffix="år" />
            <Field label="Tomgang" value={inputs.vacancyPct} onChange={(n) => set({ vacancyPct: n })} suffix="%" step={0.5} />
            <Field label="Vedligehold (af leje)" value={inputs.maintenancePct} onChange={(n) => set({ maintenancePct: n })} suffix="%" step={0.5} />
            <Field label="Købsomkostninger" value={inputs.acqCostPct} onChange={(n) => set({ acqCostPct: n })} suffix="%" step={0.5} />
            <Field label="Værdistigning" value={inputs.appreciationPct} onChange={(n) => set({ appreciationPct: n })} suffix="%/år" step={0.5} />
            <Field label="Lejevækst" value={inputs.rentGrowthPct} onChange={(n) => set({ rentGrowthPct: n })} suffix="%/år" step={0.5} />
            <Field label="Ejerperiode" value={inputs.holdYears} onChange={(n) => set({ holdYears: n })} suffix="år" />
          </div>
        )}

        <div className="mt-5">
          <span className="text-sm text-slate-600">Strategi</span>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {strategies.map((s) => (
              <button key={s.id} onClick={() => set({ strategy: s.id })}
                className={clsx("rounded-xl border px-2 py-2 text-xs font-medium transition-colors",
                  inputs.strategy === s.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white hover:border-slate-300")}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <Button className="mt-6 w-full" onClick={() => setRan(true)}>Analysér nu</Button>
      </div>

      {/* RESULTS */}
      <div className={clsx("min-w-0 space-y-4 transition-opacity sm:space-y-6", ran ? "opacity-100" : "opacity-70")}>
        {gated ? (
          <PaywallGate
            score={displayScore}
            rating={displayRating}
            verdict={displayVerdict}
            max={freeMax}
            scoreColor={scoreColor}
          />
        ) : (
        <>
        {/* Zone: VURDERING — the 5-second read */}
        <ZoneHeader label="Vurdering" hint="Overblik, score og de fire tal alle andre tal fører til" />
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
            {address && <div className="min-w-0 truncate text-sm text-slate-400">{address}</div>}
            {listingUrl && (
              <a
                href={listingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-600 sm:px-3 sm:text-xs"
                title={`Åbn det oprindelige opslag på ${sourceName(listingUrl)}`}
              >
                Se opslaget på {sourceName(listingUrl)}
                <ExternalLink size={13} />
              </a>
            )}
          </div>
          <div className="mt-1 flex min-w-0 flex-col gap-5 md:flex-row md:items-start md:justify-between md:gap-6">
            <div className="min-w-0 md:max-w-md">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Investment Score</div>
              <div className="mt-1 flex items-end gap-2.5">
                <span className={clsx("text-6xl font-bold leading-none tnum sm:text-7xl", scoreColor)}>{displayScore}</span>
                <span className="mb-1.5 text-sm font-medium text-slate-400">/ 100 · {displayRating}</span>
              </div>
              <div className="mt-4 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-100">
                <div className={clsx("h-full rounded-full", scoreBar)} style={{ width: `${Math.max(3, Math.min(100, displayScore))}%` }} />
              </div>
              <p className="mt-4 text-[15px] leading-relaxed text-slate-600 sm:mt-5 sm:text-base">{displayVerdict}</p>
              {inv?.note && <p className="mt-2 text-sm leading-relaxed text-amber-700">{inv.note}</p>}
              {!isInvestment && rentEstimated && (
                <p className="mt-2 text-sm leading-relaxed text-amber-700">
                  Bemærk: vurderingen bygger på en <b>estimeret leje</b> — bekræft den før du handler.
                </p>
              )}
            </div>
            <span className="inline-flex shrink-0 self-start rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-500 sm:px-3 sm:text-xs">
              {isInvestment ? `Investeringsejendom${subcatParam ? ` · ${subcatParam}` : ""}` : strategies.find((s) => s.id === inputs.strategy)?.label}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-slate-100 pt-6 sm:mt-8 sm:gap-x-6 sm:gap-y-7 sm:pt-7 sm:grid-cols-4">
            <KeyStat
              label="Cash flow / md." value={dk(r.cashFlow)} unit="kr" tone={cfTone}
              explain="Det, der reelt lander på din konto hver måned, når lejen har betalt lånet og alle udgifter. Positivt = ejendommen betaler dig. Negativt = du lægger penge til hver måned."
              how="Månedlig leje minus ydelsen på lånet minus alle driftsudgifter."
            />
            <KeyStat
              label="Nettoafkast" value={num(r.capRate)} unit="%"
              explain={`Hvor mange procent af prisen ejendommen tjener om året — efter driftsudgifter, men før lån. ${num(r.capRate)} % betyder, at ejendommen selv (uden lån) giver ${num(r.capRate)} % af sin pris tilbage hvert år. Højere = bedre.`}
              how="Driftsresultatet (leje minus tomgang, vedligehold og faste udgifter) delt med købsprisen."
            />
            <KeyStat
              label="Kontantafkast" value={num(r.cashOnCash)} unit="%"
              tone={r.cashOnCash >= 0 ? "text-slate-900" : "text-rose-500"}
              explain={`Hvor meget dine EGNE penge tjener om året. Du lagde ${dk(r.cashInvested)} kr (udbetaling + købsomkostninger) og får ${dk(r.annualCashFlow)} kr tilbage i cash flow — det er ${num(r.cashOnCash)} %.`}
              how="Årligt cash flow delt med de penge, du selv lagde."
            />
            <KeyStat
              label="Gældsdækning" value={num(r.dscr)} tone={dscrTone}
              explain={`Kan lejen betale lånet? 1,0 er lige akkurat. ${num(r.dscr)} betyder, at ejendommen tjener ${num(r.dscr)} gange så meget som ydelsen. Banker vil typisk gerne se mindst 1,25.`}
              how="Driftsresultatet (NOI) delt med den årlige ydelse på lånet."
            />
          </div>
          <div className="mt-5 text-xs text-slate-400">
            {Math.round(uncertainty.pCashFlowPositive * 100)} % sandsynlighed for positivt cash flow på tværs af {uncertainty.runs.toLocaleString("da-DK")} scenarier
          </div>
        </section>

        {/* Zone header: MARKED — everything that compares this deal to the region */}
        {!isInvestment && (priceBench || rentBench) && (
          <>
            <ZoneHeader label="Marked" hint="Denne bolig vs. sammenlignelige boliger i regionen" />
            <div className="grid gap-4 md:grid-cols-2">
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
          </>
        )}

        {/* Zone: DATAGRUNDLAG — always-shown, but compact */}
        <ZoneHeader label="Datagrundlag" hint="Hvor tallene kommer fra — dokumenteret, estimeret eller skal undersøges" />
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

        {/* Zone: PROGNOSE — chart + long-term details */}
        <ZoneHeader label="Prognose" hint={`Cashflow og friværdi over ${r.holdYears} år`} />
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">{r.holdYears}-årig prognose</h3>
            <span className="text-xs text-slate-400">Værdistigning {pct(inputs.appreciationPct, 0)}/år · lejevækst {pct(inputs.rentGrowthPct, 0)}/år</span>
          </div>
          <div className="mt-5 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="2 6" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="year" tickFormatter={(y) => `År ${y}`} stroke="#cbd5e1" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000).toLocaleString("da-DK")}k`} stroke="#cbd5e1" fontSize={11} width={44} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => kr(Number(v))} labelFormatter={(y) => `År ${y}`} />
                <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Friværdi" stroke="#2563eb" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Kumuleret cash flow" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 border-t border-slate-100 pt-4 text-sm">
            <span className="text-slate-500">Samlet gevinst <b className={clsx("ml-1 font-semibold tnum", r.totalProfit >= 0 ? "text-emerald-600" : "text-rose-500")}>{dk(r.totalProfit)} kr</b></span>
            <span className="text-slate-500">Nettoprovenu ved salg <b className="ml-1 font-semibold tnum text-slate-900">{dk(r.netSaleProceeds)} kr</b></span>
            <span className="text-slate-500">IRR <b className="ml-1 font-semibold tnum text-slate-900">{num(r.irr)} %</b></span>
          </div>
        </section>

        {/* progressive deep-dive — the detail stays out of the 5-second read */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <button onClick={() => setDetails((v) => !v)} className="flex w-full items-center justify-between gap-3 p-6 text-left">
            <span>
              <span className="text-sm font-semibold text-slate-900">Detaljeret analyse</span>
              <span className="ml-2 hidden text-xs text-slate-400 sm:inline">budget · finansiering · stresstest · konfidens</span>
            </span>
            <ChevronDown size={18} className={clsx("shrink-0 text-slate-400 transition-transform", details && "rotate-180")} />
          </button>

          {details && (
            <div className="space-y-8 border-t border-slate-100 p-6">
              {/* secondary ratios */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-4">
                <KeyStat
                  label="Bruttoafkast" value={num(r.grossYield)} unit="%"
                  explain="Årlig leje i forhold til prisen — FØR udgifter. Et hurtigt førstetjek. Nettoafkastet er det mere ærlige tal, fordi det trækker udgifter fra."
                  how="Årlig leje delt med købsprisen."
                />
                <KeyStat
                  label={`IRR (${r.holdYears} år)`} value={num(r.irr)} unit="%"
                  tone={isFinite(r.irr) && r.irr >= 8 ? "text-emerald-600" : "text-slate-900"}
                  explain="Det samlede årlige afkast på dine penge over hele perioden — cash flow OG værdistigning lagt sammen til én procent. Over 8–10 % er stærkt."
                  how="Alle pengestrømme (udbetaling ud nu, cash flow ind hvert år, salg til sidst) regnet om til én årlig rente."
                />
                <KeyStat
                  label="Equity multiple" value={num(r.equityMultiple)} unit="x"
                  explain={`Hvor mange gange du får dine penge igen i alt. ${num(r.equityMultiple)}x betyder: for hver 1 krone du lagde, får du ${num(r.equityMultiple)} kr tilbage over perioden.`}
                  how="Alt du får ud (samlet cash flow + nettoprovenu ved salg) delt med det, du selv lagde."
                />
                <KeyStat
                  label="Break-even belægning" value={num(r.breakEvenOccupancy, 0)} unit="%"
                  explain={`Hvor tom ejendommen må stå, før du taber penge. ${num(r.breakEvenOccupancy, 0)} % betyder: selv hvis den kun er udlejet ${num(r.breakEvenOccupancy, 0)} % af tiden, går det lige op. Lavere = mere buffer.`}
                  how="Hvor stor en del af lejen, der skal til for at dække lån og udgifter."
                />
              </div>

              {/* budget · financing · stress — grouped by whitespace, no nested cards */}
              <div className="grid gap-8 border-t border-slate-100 pt-7 md:grid-cols-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Driftsbudget (år 1)</div>
                  <dl className="mt-3 space-y-2 text-sm">
                    <Row l="Lejeindtægt" v={kr(r.annualRent)} pos />
                    <Row l="− Tomgang" v={"−" + kr(r.opex.vacancy)} />
                    <Row l="− Vedligehold" v={"−" + kr(r.opex.maintenance)} />
                    <Row l="− Faste udgifter" v={"−" + kr(r.opex.fixed)} />
                    <div className="border-t border-slate-100 pt-2"><Row l="= NOI" v={kr(r.noi)} strong /></div>
                    <Row l="− Ydelse" v={"−" + kr(r.monthlyMortgage * 12)} />
                    <div className="border-t border-slate-100 pt-2"><Row l="= Cash flow (år)" v={kr(r.annualCashFlow)} strong pos={r.annualCashFlow >= 0} /></div>
                  </dl>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Finansiering</div>
                  <dl className="mt-3 space-y-2 text-sm">
                    <Row l="Købspris" v={kr(inputs.price)} />
                    <Row l="Udbetaling" v={kr(r.downPayment)} />
                    <Row l="Købsomk." v={kr(r.cashInvested - r.downPayment)} />
                    <div className="border-t border-slate-100 pt-2"><Row l="Investeret" v={kr(r.cashInvested)} strong /></div>
                    <Row l="Lån" v={kr(r.loan)} />
                    <Row l="Belåningsgrad" v={pct(r.ltv, 0)} />
                    <Row l="Månedlig ydelse" v={krMd(r.monthlyMortgage)} />
                  </dl>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rentestress-test</div>
                  <dl className="mt-3 space-y-2 text-sm">
                    <Row l="Cash flow nu" v={krMd(r.cashFlow)} pos={r.cashFlow >= 0} />
                    {r.stress.map((s) => (
                      <Row key={s.rate} l={`Ved ${pct(s.rate, 1)}`} v={krMd(s.cashFlow)} pos={s.cashFlow >= 0} />
                    ))}
                    <div className="border-t border-slate-100 pt-2"><Row l="Break-even rente" v={pct(r.breakEvenRate, 1)} strong /></div>
                    <Row l="DSCR" v={num(r.dscr)} />
                  </dl>
                </div>
              </div>

              {/* full Monte Carlo confidence bands */}
              <div className="border-t border-slate-100 pt-7">
                <ConfidenceBands u={uncertainty} />
              </div>
            </div>
          )}
        </div>

        {/* Zone: VÆRKTØJER — value-add sim + downloads + save */}
        <ZoneHeader label="Værktøjer" hint="Byg om, gem eller download til bank" />
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

        {/* actions — one visual family: primary (dark) for "Gem", secondary (light)
            for everything else. Prior version had four different palettes competing
            for attention — this reads as one row of tools instead of a rainbow. */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Primary — the action most investors take */}
            {save.status === "saved" ? (
              <a href="/dashboard" className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 sm:px-5">
                <Check size={16} /> Gemt — se portefølje
              </a>
            ) : (
              <button onClick={saveToPortfolio} disabled={save.status === "saving"}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60 sm:px-5">
                {save.status === "saving" ? <Loader2 size={16} className="animate-spin" /> : <Bookmark size={16} />}
                Gem til portefølje
              </button>
            )}
            {/* Secondary family — all the same slate outline */}
            <button onClick={exportExcel} disabled={exporting}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60 sm:px-5">
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
              Excel
            </button>
            <button onClick={openBankReport}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 sm:px-5">
              <FileText size={16} />
              Bankrapport
            </button>
            {listingUrl && (
              watch.status === "saved" ? (
                <a href="/dashboard" className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 sm:px-5">
                  <BellRing size={16} /> Vagt aktiv
                </a>
              ) : (
                <button onClick={startWatch} disabled={watch.status === "saving"}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60 sm:px-5">
                  {watch.status === "saving" ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}
                  Overvåg pris
                </button>
              )
            )}
          </div>
          {save.status === "limit" && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Du har brugt dine analyser for denne måned.{" "}
              <a href="/priser" className="font-semibold underline">Opgradér</a> for at gemme flere boliger.
            </div>
          )}
          {save.status === "error" && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Kunne ikke gemme: {save.msg}
            </div>
          )}
          {watch.status === "error" && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Kunne ikke starte vagt: {watch.msg}
            </div>
          )}
          {listingUrl && watch.status === "idle" && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
              <Bell size={13} /> Vagt tjekker annoncen dagligt og giver besked, hvis prisen falder — så du aldrig misser en god handel.
            </p>
          )}

          {analysisLogged && !tsHidden && (
            <div className="mt-5 border-t border-slate-100 pt-5">
              <TimeSavingsCapture onSubmit={submitTimeSavings} onDismiss={() => setTsHidden(true)} />
            </div>
          )}

          <div className="mt-5 border-t border-slate-100 pt-5">
            <PrecisionFeedback region={region} strategy={inputs.strategy} onSaved={() => { const q = region ? `?region=${encodeURIComponent(region)}` : ""; fetch(`/api/calibration${q}`).then((r) => r.json()).then(setCal).catch(() => {}); }} />
          </div>
        </div>

        {/* Real-outcome reporting — only when viewing a saved analysis */}
        {savedParam && (
          <OutcomeForm
            analysisId={savedParam}
            region={region}
            predicted={{ price: inputs.price, monthlyRent: inputs.monthlyRent, appreciationPct: inputs.appreciationPct }}
          />
        )}
        </>
        )}
      </div>

      {/* Analytikeren — in-analysis expert chat (appears once an analysis exists) */}
      {ran && !gated && (
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

function Row({ l, v, pos, strong }: { l: string; v: string; pos?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={clsx("min-w-0 text-slate-500", strong && "font-semibold text-slate-900")}>{l}</dt>
      <dd className={clsx("shrink-0 whitespace-nowrap tnum font-semibold tabular-nums", pos === true && "text-emerald-600", pos === false && "text-rose-500", pos === undefined && "text-slate-900")}>{v}</dd>
    </div>
  );
}

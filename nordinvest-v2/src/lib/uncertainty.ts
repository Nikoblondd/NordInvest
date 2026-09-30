// Fase 3 — the uncertainty engine.
//
// A single point estimate ("afkast = 4,2 %") hides the most important thing an
// investor and a bank want to know: HOW SURE are we? This runs a deterministic
// Monte Carlo simulation over the genuinely uncertain inputs (rent, market
// appreciation, interest, vacancy, costs) and reports the RANGE of outcomes as
// P10 / P50 / P90 bands plus a downside probability.
//
// Two design choices make this trustworthy rather than "vague":
//   1. Deterministic — a seeded RNG means the same property always yields the
//      same band. A report you can reproduce is a report a bank can trust.
//   2. Data-driven width — the band tightens as the "brain" accumulates real
//      local outcomes (higher confidence → smaller rent uncertainty), so the
//      interval reflects what we actually know, not a fixed hand-wave.

import { analyze, type AnalysisInput } from "@/lib/analysis";

export type Band = { p10: number; p50: number; p90: number; mean: number };

export type UncertaintyResult = {
  runs: number;
  cashFlow: Band; // kr/md
  capRate: Band; // %
  cashOnCash: Band; // %
  irr: Band; // %
  totalProfit: Band; // kr
  score: Band;
  pCashFlowPositive: number; // 0..1, andel af scenarier med positivt cash flow
  pScoreSolid: number; // 0..1, andel med score >= 65
  // Assumptions actually used to build the band (for the report's transparency).
  assumptions: {
    rentSigmaPct: number;
    appreciationSigmaPp: number;
    interestSigmaPp: number;
    vacancySigmaPp: number;
    confidence: number;
  };
};

// --- deterministic RNG (mulberry32) + gaussian (Box–Muller) ---
function hashSeed(input: AnalysisInput, salt: number): number {
  const s = `${input.price}|${input.monthlyRent}|${input.downPaymentPct}|${input.interestRate}|${input.monthlyOpex}|${input.appreciationPct}|${input.holdYears}|${salt}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeGaussian(rng: () => number): () => number {
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const v = spare;
      spare = null;
      return v;
    }
    let u = 0;
    let v = 0;
    let s = 0;
    do {
      u = rng() * 2 - 1;
      v = rng() * 2 - 1;
      s = u * u + v * v;
    } while (s === 0 || s >= 1);
    const mul = Math.sqrt((-2 * Math.log(s)) / s);
    spare = v * mul;
    return u * mul;
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function band(values: number[]): Band {
  const finite = values.filter((v) => Number.isFinite(v));
  const sorted = [...finite].sort((a, b) => a - b);
  const mean = finite.reduce((s, v) => s + v, 0) / (finite.length || 1);
  return {
    p10: percentile(sorted, 0.1),
    p50: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
    mean,
  };
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export type UncertaintyOpts = {
  confidence?: number; // 0..1 from the brain (regional data density)
  rentEstimated?: boolean; // rent was estimated from m², not read from the listing
  runs?: number;
};

export function runUncertainty(input: AnalysisInput, opts: UncertaintyOpts = {}): UncertaintyResult {
  const confidence = clamp(opts.confidence ?? 0, 0, 1);
  const runs = opts.runs ?? 2000;

  // Band widths. A well-calibrated region (high confidence) narrows the rent
  // uncertainty most, because that is exactly what the brain validates.
  const rentSigmaPct = clamp((opts.rentEstimated ? 0.12 : 0.07) * (1 - 0.45 * confidence), 0.03, 0.16);
  const appreciationSigmaPp = clamp(1.6 * (1 - 0.3 * confidence), 0.8, 1.8); // market risk is real
  const interestSigmaPp = 0.5;
  const vacancySigmaPp = 2.0;
  const maintenanceSigmaPct = 0.2;
  const opexSigmaPct = 0.1;

  const gauss = makeGaussian(mulberry32(hashSeed(input, 1)));

  const cashFlow: number[] = [];
  const capRate: number[] = [];
  const cashOnCash: number[] = [];
  const irr: number[] = [];
  const totalProfit: number[] = [];
  const score: number[] = [];
  let positive = 0;
  let solid = 0;

  const baseVacancy = input.vacancyPct ?? 4;
  const baseMaint = input.maintenancePct ?? 8;
  const baseOpex = input.monthlyOpex ?? Math.round((input.price * 0.006) / 12);
  const baseApprec = input.appreciationPct ?? 3;

  for (let i = 0; i < runs; i++) {
    const draw: AnalysisInput = {
      ...input,
      monthlyRent: Math.max(0, input.monthlyRent * (1 + gauss() * rentSigmaPct)),
      interestRate: clamp(input.interestRate + gauss() * interestSigmaPp, 0.1, 25),
      appreciationPct: clamp(baseApprec + gauss() * appreciationSigmaPp, -8, 15),
      vacancyPct: clamp(baseVacancy + gauss() * vacancySigmaPp, 0, 40),
      maintenancePct: Math.max(0, baseMaint * (1 + gauss() * maintenanceSigmaPct)),
      monthlyOpex: Math.max(0, baseOpex * (1 + gauss() * opexSigmaPct)),
    };
    const r = analyze(draw);
    cashFlow.push(r.cashFlow);
    capRate.push(r.capRate);
    cashOnCash.push(r.cashOnCash);
    if (Number.isFinite(r.irr)) irr.push(r.irr);
    totalProfit.push(r.totalProfit);
    score.push(r.score);
    if (r.cashFlow >= 0) positive++;
    if (r.score >= 65) solid++;
  }

  return {
    runs,
    cashFlow: band(cashFlow),
    capRate: band(capRate),
    cashOnCash: band(cashOnCash),
    irr: band(irr),
    totalProfit: band(totalProfit),
    score: band(score),
    pCashFlowPositive: positive / runs,
    pScoreSolid: solid / runs,
    assumptions: { rentSigmaPct, appreciationSigmaPp, interestSigmaPp, vacancySigmaPp, confidence },
  };
}

// A short, human label for how wide the band is → how certain we are.
export type CertaintyLevel = "high" | "medium" | "low";

export function certaintyFromBand(b: Band): CertaintyLevel {
  // Relative spread of the cash-on-cash / cap-rate style band.
  const spread = Math.abs(b.p90 - b.p10);
  const scale = Math.max(1, Math.abs(b.p50));
  const rel = spread / scale;
  if (rel < 0.4) return "high";
  if (rel < 0.9) return "medium";
  return "low";
}

export const CERTAINTY_LABEL: Record<CertaintyLevel, string> = {
  high: "Høj sikkerhed",
  medium: "Middel sikkerhed",
  low: "Bred usikkerhed",
};

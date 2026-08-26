export type Strategy = "cashflow" | "appreciation" | "value_add";

export type AnalysisInput = {
  price: number; // DKK
  monthlyRent: number; // DKK
  downPaymentPct: number; // %
  interestRate: number; // annual %
  termYears?: number; // default 30
  monthlyOpex?: number; // ejerudgift + faste driftsudgifter (ekskl. finansiering + vedligehold)
  vacancyPct?: number; // tomgang, default 4
  maintenancePct?: number; // vedligehold i % af leje, default 8
  acqCostPct?: number; // købsomkostninger i % af pris, default 1.5
  appreciationPct?: number; // værdistigning pr. år, default 3
  rentGrowthPct?: number; // lejevækst pr. år, default 2
  holdYears?: number; // ejerperiode, default 10
  strategy?: Strategy;
};

export type YearRow = {
  year: number;
  rent: number; // årlig effektiv leje
  noi: number;
  debtService: number;
  cashFlow: number;
  cumulativeCashFlow: number;
  loanBalance: number;
  propertyValue: number;
  equity: number;
};

export type AnalysisResult = {
  score: number;
  rating: string;
  verdict: string;

  // yields
  grossYield: number; // %
  capRate: number; // nettoafkast / cap rate %
  cashOnCash: number; // kontantafkast (år 1) %

  // cash flow (year 1)
  annualRent: number;
  effectiveRent: number;
  noi: number;
  monthlyMortgage: number;
  cashFlow: number; // kr/md
  annualCashFlow: number;

  // financing / risk
  downPayment: number;
  cashInvested: number; // udbetaling + købsomkostninger
  loan: number;
  ltv: number; // %
  dscr: number; // gældsserviceringsgrad
  breakEvenOccupancy: number; // %
  breakEvenRate: number; // %
  stress: { rate: number; cashFlow: number }[];

  // opex breakdown (year 1, annual)
  opex: { vacancy: number; maintenance: number; fixed: number; total: number };

  // hold-period return
  holdYears: number;
  projection: YearRow[];
  saleValue: number;
  saleCostsPct: number;
  netSaleProceeds: number;
  totalProfit: number;
  equityMultiple: number;
  irr: number; // %
};

const D = {
  termYears: 30,
  vacancyPct: 4,
  maintenancePct: 8,
  acqCostPct: 1.5,
  appreciationPct: 3,
  rentGrowthPct: 2,
  holdYears: 10,
  saleCostsPct: 1.5,
};

export function monthlyPayment(loan: number, annualRatePct: number, termYears: number): number {
  return annuity(loan, annualRatePct, termYears);
}

function annuity(loan: number, annualRatePct: number, termYears: number): number {
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return loan / n;
  const f = Math.pow(1 + r, n);
  return (loan * (r * f)) / (f - 1);
}

// remaining balance after `elapsedYears` on an annuity loan
function loanBalance(loan: number, annualRatePct: number, termYears: number, elapsedYears: number): number {
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  const p = Math.min(elapsedYears * 12, n);
  if (r === 0) return Math.max(0, loan * (1 - p / n));
  const f = Math.pow(1 + r, n);
  const fp = Math.pow(1 + r, p);
  return Math.max(0, loan * ((f - fp) / (f - 1)));
}

function irr(cashflows: number[]): number {
  // Newton's method with bisection fallback; returns annual % (NaN-safe)
  let rate = 0.1;
  for (let i = 0; i < 60; i++) {
    let npv = 0;
    let d = 0;
    for (let t = 0; t < cashflows.length; t++) {
      npv += cashflows[t] / Math.pow(1 + rate, t);
      if (t > 0) d += (-t * cashflows[t]) / Math.pow(1 + rate, t + 1);
    }
    if (Math.abs(d) < 1e-9) break;
    const next = rate - npv / d;
    if (!isFinite(next)) break;
    if (Math.abs(next - rate) < 1e-7) {
      rate = next;
      break;
    }
    rate = next;
  }
  if (!isFinite(rate) || rate < -0.99 || rate > 10) {
    // bisection fallback
    let lo = -0.9;
    let hi = 5;
    const npvAt = (rr: number) => cashflows.reduce((s, c, t) => s + c / Math.pow(1 + rr, t), 0);
    if (npvAt(lo) * npvAt(hi) > 0) return NaN;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      if (npvAt(mid) > 0) lo = mid;
      else hi = mid;
    }
    rate = (lo + hi) / 2;
  }
  return rate * 100;
}

export function analyze(input: AnalysisInput): AnalysisResult {
  const price = input.price;
  const monthlyRent = input.monthlyRent;
  const downPaymentPct = input.downPaymentPct;
  const interestRate = input.interestRate;
  const termYears = input.termYears ?? D.termYears;
  const vacancyPct = input.vacancyPct ?? D.vacancyPct;
  const maintenancePct = input.maintenancePct ?? D.maintenancePct;
  const acqCostPct = input.acqCostPct ?? D.acqCostPct;
  const appreciationPct = input.appreciationPct ?? D.appreciationPct;
  const rentGrowthPct = input.rentGrowthPct ?? D.rentGrowthPct;
  const holdYears = input.holdYears ?? D.holdYears;
  const monthlyOpexFixed = input.monthlyOpex ?? Math.round((price * 0.006) / 12); // fallback ~0,6 %/år
  const strategy = input.strategy ?? "cashflow";

  const downPayment = price * (downPaymentPct / 100);
  const acqCosts = price * (acqCostPct / 100);
  const cashInvested = downPayment + acqCosts;
  const loan = price - downPayment;
  const ltv = price > 0 ? (loan / price) * 100 : 0;
  const monthlyMortgage = annuity(loan, interestRate, termYears);
  const annualDebtService = monthlyMortgage * 12;

  const annualRent = monthlyRent * 12;
  const vacancy = annualRent * (vacancyPct / 100);
  const effectiveRent = annualRent - vacancy;
  const maintenance = annualRent * (maintenancePct / 100);
  const fixed = monthlyOpexFixed * 12;
  const opexTotal = vacancy + maintenance + fixed;
  const noi = annualRent - opexTotal;

  const annualCashFlow = noi - annualDebtService;
  const cashFlow = annualCashFlow / 12;

  const grossYield = price > 0 ? (annualRent / price) * 100 : 0;
  const capRate = price > 0 ? (noi / price) * 100 : 0;
  const cashOnCash = cashInvested > 0 ? (annualCashFlow / cashInvested) * 100 : 0;
  const dscr = annualDebtService > 0 ? noi / annualDebtService : 0;
  const breakEvenOccupancy =
    annualRent > 0 ? ((annualDebtService + maintenance + fixed) / annualRent) * 100 : 0;

  const stress = [1, 2].map((delta) => {
    const m = annuity(loan, interestRate + delta, termYears);
    return { rate: interestRate + delta, cashFlow: (noi - m * 12) / 12 };
  });

  let breakEvenRate = interestRate;
  for (let r = 0; r <= 25; r += 0.05) {
    const m = annuity(loan, r, termYears);
    if (noi - m * 12 <= 0) {
      breakEvenRate = r;
      break;
    }
    breakEvenRate = 25;
  }

  // Hold-period projection
  const projection: YearRow[] = [];
  let cumulative = 0;
  for (let y = 1; y <= holdYears; y++) {
    const grownAnnualRent = annualRent * Math.pow(1 + rentGrowthPct / 100, y - 1);
    const grownMaint = grownAnnualRent * (maintenancePct / 100);
    const grownFixed = fixed * Math.pow(1 + 0.02, y - 1); // udgifter +2 %/år
    const yNoiClean = grownAnnualRent - grownAnnualRent * (vacancyPct / 100) - grownMaint - grownFixed;
    const yCash = yNoiClean - annualDebtService;
    cumulative += yCash;
    const bal = loanBalance(loan, interestRate, termYears, y);
    const value = price * Math.pow(1 + appreciationPct / 100, y);
    projection.push({
      year: y,
      rent: Math.round(grownAnnualRent),
      noi: Math.round(yNoiClean),
      debtService: Math.round(annualDebtService),
      cashFlow: Math.round(yCash),
      cumulativeCashFlow: Math.round(cumulative),
      loanBalance: Math.round(bal),
      propertyValue: Math.round(value),
      equity: Math.round(value - bal),
    });
  }

  const saleValue = price * Math.pow(1 + appreciationPct / 100, holdYears);
  const saleCostsPct = D.saleCostsPct;
  const endBalance = loanBalance(loan, interestRate, termYears, holdYears);
  const netSaleProceeds = saleValue * (1 - saleCostsPct / 100) - endBalance;
  const totalProfit = cumulative + netSaleProceeds - cashInvested;
  const equityMultiple = cashInvested > 0 ? (cumulative + netSaleProceeds) / cashInvested : 0;

  const flows = [-cashInvested];
  for (let y = 1; y <= holdYears; y++) {
    const base = projection[y - 1].cashFlow;
    flows.push(y === holdYears ? base + netSaleProceeds : base);
  }
  const irrPct = irr(flows);

  const { score, rating, verdict } = scoreAndVerdict({ capRate, cashOnCash, dscr, cashFlow, irr: irrPct, strategy });

  return {
    score,
    rating,
    verdict,
    grossYield,
    capRate,
    cashOnCash,
    annualRent,
    effectiveRent,
    noi,
    monthlyMortgage,
    cashFlow,
    annualCashFlow,
    downPayment,
    cashInvested,
    loan,
    ltv,
    dscr,
    breakEvenOccupancy,
    breakEvenRate,
    stress,
    opex: { vacancy, maintenance, fixed, total: opexTotal },
    holdYears,
    projection,
    saleValue,
    saleCostsPct,
    netSaleProceeds,
    totalProfit,
    equityMultiple,
    irr: irrPct,
  };
}

function scoreAndVerdict(a: {
  capRate: number;
  cashOnCash: number;
  dscr: number;
  cashFlow: number;
  irr: number;
  strategy: Strategy;
}): { score: number; rating: string; verdict: string } {
  let score = 50;

  if (a.capRate > 6) score += 15;
  else if (a.capRate > 4.5) score += 8;
  else if (a.capRate < 3.5) score -= 10;

  if (a.cashFlow > 2000) score += 15;
  else if (a.cashFlow > 0) score += 8;
  else if (a.cashFlow < -1500) score -= 15;

  if (a.dscr >= 1.25) score += 10;
  else if (a.dscr >= 1.0) score += 4;
  else score -= 12;

  if (isFinite(a.irr)) {
    if (a.irr > 12) score += 10;
    else if (a.irr > 8) score += 5;
    else if (a.irr < 3) score -= 8;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let rating: string;
  if (score >= 80) rating = "Fremragende";
  else if (score >= 65) rating = "Solid";
  else if (score >= 45) rating = "Middel";
  else rating = "Svag";

  let verdict: string;
  if (score >= 65) {
    verdict =
      a.dscr >= 1.2
        ? "Solid handel. Positivt cash flow og komfortabel gældsdækning (DSCR " + a.dscr.toFixed(2) + ")."
        : "God på afkast, men gældsdækningen er stram — forhandl pris eller udbetaling.";
  } else if (score >= 45) {
    verdict = "Grænsehandel. Tallene hænger, men marginen er tynd — kør følsomhedsscenarierne.";
  } else {
    verdict = "Spring over eller genforhandl. Afkast og gældsdækning bærer ikke handlen.";
  }
  return { score, rating, verdict };
}

// ---- Danish formatting ----
export function kr(n: number): string {
  return `${Math.round(n).toLocaleString("da-DK")} kr`;
}
export function krMd(n: number): string {
  return `${Math.round(n).toLocaleString("da-DK")} kr/md.`;
}
export function pct(n: number, decimals = 2): string {
  if (!isFinite(n)) return "–";
  return `${n.toLocaleString("da-DK", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} %`;
}
export function num(n: number, decimals = 2): string {
  if (!isFinite(n)) return "–";
  return n.toLocaleString("da-DK", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

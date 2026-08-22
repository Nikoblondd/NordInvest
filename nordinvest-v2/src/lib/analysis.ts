export type Strategy = "cashflow" | "appreciation" | "value_add";

export type AnalysisInput = {
  price: number; // DKK
  monthlyRent: number; // DKK
  downPaymentPct: number; // %
  interestRate: number; // annual %
  monthlyExpenses: number; // DKK
  termYears?: number; // default 30
  strategy?: Strategy;
};

export type AnalysisResult = {
  score: number; // 0-100
  rating: string; // Danish label
  verdict: string; // one-line Danish verdict
  grossYield: number; // %
  netYield: number; // %
  cashFlow: number; // DKK/md
  roi: number; // cash-on-cash %, annual
  downPayment: number; // DKK
  loan: number; // DKK
  monthlyMortgage: number; // DKK
  stress: { rate: number; cashFlow: number }[];
  breakEvenRate: number; // % where cashflow hits 0
  forecast: { year: number; value: number }[]; // 5-yr value (DKK)
};

export function monthlyPayment(
  loan: number,
  annualRatePct: number,
  termYears: number,
): number {
  return annuity(loan, annualRatePct, termYears);
}

function annuity(loan: number, annualRatePct: number, termYears: number): number {
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return loan / n;
  const f = Math.pow(1 + r, n);
  return (loan * (r * f)) / (f - 1);
}

const APPRECIATION_PA = 0.03; // 3% p.a. baseline (DST EJ55-ish)

export function analyze(input: AnalysisInput): AnalysisResult {
  const {
    price,
    monthlyRent,
    downPaymentPct,
    interestRate,
    monthlyExpenses,
    termYears = 30,
    strategy = "cashflow",
  } = input;

  const downPayment = price * (downPaymentPct / 100);
  const loan = price - downPayment;
  const monthlyMortgage = annuity(loan, interestRate, termYears);

  const annualRent = monthlyRent * 12;
  const annualExpenses = monthlyExpenses * 12;

  const grossYield = price > 0 ? (annualRent / price) * 100 : 0;
  const netYield = price > 0 ? ((annualRent - annualExpenses) / price) * 100 : 0;

  const cashFlow = monthlyRent - monthlyMortgage - monthlyExpenses;
  const annualProfit = cashFlow * 12;
  const roi = downPayment > 0 ? (annualProfit / downPayment) * 100 : 0;

  const stress = [1, 2].map((delta) => {
    const m = annuity(loan, interestRate + delta, termYears);
    return { rate: interestRate + delta, cashFlow: monthlyRent - m - monthlyExpenses };
  });

  // Break-even rate: the interest rate where monthly cashflow = 0
  let breakEvenRate = interestRate;
  for (let r = 0; r <= 25; r += 0.05) {
    const m = annuity(loan, r, termYears);
    if (monthlyRent - m - monthlyExpenses <= 0) {
      breakEvenRate = r;
      break;
    }
    breakEvenRate = 25;
  }

  const forecast = Array.from({ length: 6 }, (_, i) => ({
    year: i,
    value: Math.round(price * Math.pow(1 + APPRECIATION_PA, i)),
  }));

  const { score, rating, verdict } = scoreAndVerdict({
    grossYield,
    cashFlow,
    roi,
    stress,
    strategy,
  });

  return {
    score,
    rating,
    verdict,
    grossYield,
    netYield,
    cashFlow,
    roi,
    downPayment,
    loan,
    monthlyMortgage,
    stress,
    breakEvenRate,
    forecast,
  };
}

function scoreAndVerdict(a: {
  grossYield: number;
  cashFlow: number;
  roi: number;
  stress: { rate: number; cashFlow: number }[];
  strategy: Strategy;
}): { score: number; rating: string; verdict: string } {
  let score = 50;

  if (a.grossYield > 7) score += 15;
  else if (a.grossYield > 5) score += 8;
  else if (a.grossYield < 4) score -= 10;

  if (a.cashFlow > 2000) score += 15;
  else if (a.cashFlow > 0) score += 8;
  else if (a.cashFlow < -1500) score -= 15;

  if (a.roi > 8) score += 10;
  else if (a.roi > 5) score += 5;
  else if (a.roi < 0) score -= 10;

  // Reward surviving a +2 pp rate stress test
  const stress2 = a.stress.find((s) => Math.round(s.rate) >= 0 && a.stress.indexOf(s) === 1);
  if (stress2 && stress2.cashFlow > 0) score += 5;

  score = Math.max(0, Math.min(100, Math.round(score)));

  let rating: string;
  if (score >= 80) rating = "Fremragende";
  else if (score >= 65) rating = "Solid";
  else if (score >= 45) rating = "Middel";
  else rating = "Svag";

  const survives = a.stress[1]?.cashFlow > 0;
  let verdict: string;
  if (score >= 65) {
    verdict = survives
      ? "Solid handel. Positiv cash flow, der overlever +2 %-point rentestigning."
      : "God på papiret, men følsom over for rentestigninger — forhandl prisen.";
  } else if (score >= 45) {
    verdict = "Grænsehandel. Tallene hænger sammen, men marginen er tynd.";
  } else {
    verdict = "Spring over eller genforhandl. Cash flow og afkast bærer ikke handlen.";
  }

  return { score, rating, verdict };
}

// ---- Danish formatting (DKK, thousands ".", decimals ",") ----

export function kr(n: number): string {
  return `${Math.round(n).toLocaleString("da-DK")} kr`;
}

export function krMd(n: number): string {
  const s = Math.round(n).toLocaleString("da-DK");
  return `${s} kr/md.`;
}

export function pct(n: number, decimals = 2): string {
  return `${n.toLocaleString("da-DK", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} %`;
}

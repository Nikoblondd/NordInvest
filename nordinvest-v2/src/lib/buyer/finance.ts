import { purchaseCosts } from "@/lib/dk-fees";

/*
 * A home buyer's money questions, in plain numbers. Shared by the browser
 * (instant recalculation) and the server. Every assumption is named, so the
 * page can show it next to the result.
 */

/** Danish home financing: at least 5 % down, mortgage up to 80 %, a bank loan for the rest. */
export const MIN_DOWN = 0.05;
export const MORTGAGE_SHARE = 0.8;
/** Banks look hard at total debt above four times the household's yearly income before tax (Finanstilsynet). */
export const DEBT_FACTOR = 4;
/** Typical rate on a boliglån (the bank part), a cautious estimate. */
export const BANK_RATE = 6.5;
/** Value of the interest deduction on the first 50.000 kr. (100.000 kr. for a couple) a year, 2026. */
export const DEDUCTION = 0.33;

const annuity = (principal: number, ratePct: number, years: number) => {
  const r = ratePct / 100 / 12, n = years * 12;
  if (principal <= 0) return 0;
  return r === 0 ? principal / n : (principal * r) / (1 - Math.pow(1 + r, -n));
};

/** Balance left after `months` payments on an annuity loan. */
export function balanceAfter(principal: number, ratePct: number, years: number, months: number): number {
  const r = ratePct / 100 / 12, pay = annuity(principal, ratePct, years);
  if (r === 0) return Math.max(0, principal - pay * months);
  return Math.max(0, principal * Math.pow(1 + r, months) - pay * ((Math.pow(1 + r, months) - 1) / r));
}

export type Financing = {
  price: number; down: number; mortgage: number; bank: number;
  mortgagePay: number; bankPay: number; ownerCost: number;
  /** Interest in the first year, before the deduction. */
  interestYear1: number;
  deductionMonthly: number;
  /** Monthly cost after the deduction: loans + ejerudgift. */
  monthlyNet: number;
  costs: number;
  cashNeeded: number;
};

/** What a home costs a month, with 5 % (or more) down, a 30-year fixed mortgage and a 20-year bank loan. */
export function financing(price: number, opts: { downPct?: number; mortgageRate: number; bankRate?: number; ownerCost: number; couple?: boolean }): Financing {
  const downPct = Math.max(MIN_DOWN, Math.min(1, (opts.downPct ?? 5) / 100));
  const down = price * downPct;
  const mortgage = Math.min(price * MORTGAGE_SHARE, price - down);
  const bank = Math.max(0, price - down - mortgage);
  const bankRate = opts.bankRate ?? BANK_RATE;
  const mortgagePay = annuity(mortgage, opts.mortgageRate, 30);
  const bankPay = annuity(bank, bankRate, 20);
  const interestYear1 = mortgage * (opts.mortgageRate / 100) + bank * (bankRate / 100);
  const cap = opts.couple ? 100_000 : 50_000;
  const deductionMonthly = (Math.min(interestYear1, cap) * DEDUCTION + Math.max(0, interestYear1 - cap) * 0.25) / 12;
  const costs = purchaseCosts(price, mortgage + bank).total;
  return {
    price, down, mortgage, bank, mortgagePay, bankPay, ownerCost: opts.ownerCost,
    interestYear1, deductionMonthly,
    monthlyNet: mortgagePay + bankPay + opts.ownerCost - deductionMonthly,
    costs, cashNeeded: down + costs,
  };
}

export type Capacity = { maxPrice: number; limitedBy: "indkomst" | "opsparing"; byIncome: number; bySavings: number; maxDebt: number };

/** The most a household can buy for: four times the income in debt, and savings for 5 % down plus costs. */
export function capacity(income: number, savings: number, otherDebt: number): Capacity {
  const maxDebt = Math.max(0, income * DEBT_FACTOR - otherDebt);
  const byIncome = maxDebt / (1 - MIN_DOWN);
  // Savings cover 5 % down plus the fees, which grow with the price: solve by stepping down.
  let bySavings = Math.max(0, savings / MIN_DOWN);
  for (let i = 0; i < 30; i++) {
    const need = bySavings * MIN_DOWN + purchaseCosts(bySavings, bySavings * (1 - MIN_DOWN)).total;
    if (need <= savings) break;
    bySavings *= savings / need;
  }
  const maxPrice = Math.min(byIncome, bySavings);
  return { maxPrice, limitedBy: byIncome <= bySavings ? "indkomst" : "opsparing", byIncome, bySavings, maxDebt };
}

/*
 * Bidrag (the mortgage bank's fee) for a fixed-rate owner-occupied loan with
 * amortisation, per slice of the loan-to-value, from the institutes' 2026
 * price sheets. Totalkredit after its KundeKroner discount. Rates change:
 * the page links to each price sheet.
 */
export const INSTITUTES: { name: string; via: string; bands: [number, number, number]; url: string }[] = [
  { name: "Totalkredit", via: "Gennem din lokale bank (fx Jutlander, Sydbank, Spar Nord, Arbejdernes Landsbank)", bands: [0.2, 0.6, 0.95], url: "https://www.totalkredit.dk/boliglan/priser/" },
  { name: "Realkredit Danmark", via: "Gennem Danske Bank", bands: [0.21, 0.62, 1.01], url: "https://rd.dk/privat/priser" },
  { name: "Nordea Kredit", via: "Gennem Nordea", bands: [0.23, 0.68, 1.03], url: "https://www.nordea.dk/privat/produkter/boliglan/priser-boliglaan.html" },
  { name: "Jyske Realkredit", via: "Gennem Jyske Bank", bands: [0.23, 0.8, 1.0], url: "https://www.jyskebank.dk/bolig/priser" },
];
export const INSTITUTES_AS_OF = "prisblade 2026, fastforrentet lån med afdrag";

/** Yearly bidrag on a mortgage of `mortgage` on a home worth `value`: 0-40 %, 40-60 % and 60-80 % of the value are charged separately. */
export function yearlyBidrag(value: number, mortgage: number, bands: [number, number, number]): number {
  const slices = [0.4, 0.2, 0.2];
  let left = mortgage, total = 0;
  slices.forEach((s, i) => { const part = Math.min(left, value * s); total += (part * bands[i]) / 100; left -= part; });
  return total;
}

export type EquityPoint = { year: number; value: number; debt: number; equity: number; valueFlat: number; equityFlat: number };

/**
 * Friværdi year by year: the home's market value (today's estimate, growing
 * with the region's long-run price trend) minus what is left of the loans.
 * The "flat" line assumes prices stand still, as a cautious case.
 */
export function equityPath(f: Financing, marketValue: number, growthPct: number, mortgageRate: number, years = 10, bankRate = BANK_RATE): EquityPoint[] {
  const out: EquityPoint[] = [];
  for (let y = 0; y <= years; y++) {
    const debt = balanceAfter(f.mortgage, mortgageRate, 30, y * 12) + balanceAfter(f.bank, bankRate, 20, y * 12);
    const value = marketValue * Math.pow(1 + growthPct / 100, y);
    out.push({ year: y, value, debt, equity: value - debt, valueFlat: marketValue, equityFlat: marketValue - debt });
  }
  return out;
}

/** A rough monthly ejerudgift (andel: boligafgift) when the listing gives none: taxes, insurance, fællesudgifter. Editable on the page. */
export function defaultOwnerCost(type: string, area: number, price: number): number {
  const base = type === "condo" || type === "villa apartment" ? 1800 + area * 12 : type === "cooperative" ? 2500 + area * 30 : 1500 + (price * 0.0035) / 12 + area * 8;
  return Math.round(base / 100) * 100;
}

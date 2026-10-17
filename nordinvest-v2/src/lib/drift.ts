/*
 * Running a property after it is bought (Drift): leases, the actual monthly
 * income and costs, and the loan. Stored on the case (property_data.mappe.drift),
 * next to the analysis, so the real numbers can be held up against what the
 * analysis expected. Pure functions only; the UI lives in components/app/Drift.
 */

export type Lease = {
  id: string;
  tenant: string;
  unit?: string;
  /** Monthly rent in kr. (without utilities on account). */
  rent: number;
  /** Lease start "YYYY-MM-DD". */
  start: string;
  deposit?: number;
  /** The contract allows a yearly net price index (nettoprisindeks) regulation. */
  indexed?: boolean;
  /** Last time the rent was regulated "YYYY-MM-DD". */
  regulatedAt?: string | null;
  /** Moved out "YYYY-MM-DD"; the lease no longer counts. */
  end?: string | null;
};

export type EntryKind = "leje" | "udgift";
export type Entry = { id: string; month: string; kind: EntryKind; label: string; amount: number };

export type Loan = { principal: number; ratePct: number; years: number; /** First payment month "YYYY-MM". */ start: string };

export type Drift = {
  boughtAt?: string | null;
  boughtPrice?: number | null;
  leases: Lease[];
  entries: Entry[];
  loan?: Loan | null;
};

export const EMPTY_DRIFT: Drift = { leases: [], entries: [], loan: null };

export const EXPENSE_LABELS = ["Ejendomsskat", "Forsikring", "Fællesudgifter", "Vedligehold", "Vand og varme", "Administration", "Andet"] as const;

export const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthsBetween = (a: string, b: string) => {
  const [ay, am] = a.split("-").map(Number), [by, bm] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
};
export const monthLabel = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString("da-DK", { month: "short", year: "numeric" });
};
/** The `n` months up to and including `to`, oldest first. */
export function lastMonths(n: number, to = monthKey()): string[] {
  const [y, m] = to.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => monthKey(new Date(y, m - 1 - (n - 1 - i), 1)));
}

/** Monthly payment on an annuity loan. */
export function payment(l: Loan): number {
  const n = l.years * 12, r = l.ratePct / 100 / 12;
  if (!(l.principal > 0) || !(n > 0)) return 0;
  return r === 0 ? l.principal / n : (l.principal * r) / (1 - Math.pow(1 + r, -n));
}

/** Outstanding debt after the payments made up to and including `month`. */
export function balance(l: Loan, month = monthKey()): number {
  const paid = Math.max(0, Math.min(l.years * 12, monthsBetween(l.start, month) + 1));
  const r = l.ratePct / 100 / 12, p = payment(l);
  if (r === 0) return Math.max(0, l.principal - p * paid);
  return Math.max(0, l.principal * Math.pow(1 + r, paid) - (p * (Math.pow(1 + r, paid) - 1)) / r);
}

export const activeLeases = (d: Drift, day = new Date().toISOString().slice(0, 10)) =>
  d.leases.filter((l) => l.start <= day && (!l.end || l.end > day));

/** Rent the active leases should bring in each month. */
export const expectedRent = (d: Drift) => activeLeases(d).reduce((s, l) => s + (l.rent || 0), 0);

export type MonthRow = { month: string; income: number; costs: number; loan: number; net: number; registered: boolean };

/** Income, costs, loan payment and the result for each month. Loan payments count from the loan's first month. */
export function months(d: Drift, list: string[]): MonthRow[] {
  const pay = d.loan ? payment(d.loan) : 0;
  return list.map((month) => {
    const es = d.entries.filter((e) => e.month === month);
    const income = es.filter((e) => e.kind === "leje").reduce((s, e) => s + e.amount, 0);
    const costs = es.filter((e) => e.kind === "udgift").reduce((s, e) => s + e.amount, 0);
    const loan = d.loan && monthsBetween(d.loan.start, month) >= 0 && monthsBetween(d.loan.start, month) < d.loan.years * 12 ? pay : 0;
    return { month, income, costs, loan, net: income - costs - loan, registered: es.length > 0 };
  });
}

/** Average monthly result over the registered months among the last 12 (null if nothing is registered). */
export function actualCashFlow(d: Drift): { avg: number; months: number } | null {
  const rows = months(d, lastMonths(12)).filter((r) => r.registered);
  if (!rows.length) return null;
  return { avg: rows.reduce((s, r) => s + r.net, 0) / rows.length, months: rows.length };
}

/** Next date the lease can be regulated: one year after the last regulation or the start. */
export function nextRegulation(l: Lease): string | null {
  if (!l.indexed) return null;
  const from = new Date(`${l.regulatedAt || l.start}T12:00:00`);
  if (Number.isNaN(from.getTime())) return null;
  const today = new Date().toISOString().slice(0, 10);
  const d = new Date(from);
  do d.setFullYear(d.getFullYear() + 1); while (d.toISOString().slice(0, 10) < today);
  return d.toISOString().slice(0, 10);
}

/**
 * Estimated market value: the purchase price with 3 % a year since the purchase.
 * Shown as an estimate; the member can see the assumption.
 */
export function estimatedValue(d: Drift, growthPct = 3): number | null {
  if (!d.boughtPrice) return null;
  const yrs = d.boughtAt ? Math.max(0, (Date.now() - new Date(d.boughtAt).getTime()) / (365.25 * 864e5)) : 0;
  return d.boughtPrice * Math.pow(1 + growthPct / 100, yrs);
}

/** Starting point when a case becomes Købt: price, loan and date from the case and its analysis. */
export function driftFromCase(pd: Record<string, unknown>, acceptedOffer?: number | null): Drift {
  const price = acceptedOffer || Number(pd.price) || 0;
  const dp = Number(pd.downPaymentPct) || 20;
  const rate = Number(pd.interestRate) || 5;
  const today = new Date();
  const next = monthKey(new Date(today.getFullYear(), today.getMonth() + 1, 1));
  return {
    boughtAt: today.toISOString().slice(0, 10),
    boughtPrice: price || null,
    leases: [],
    entries: [],
    loan: price ? { principal: Math.round(price * (1 - dp / 100)), ratePct: rate, years: 30, start: next } : null,
  };
}

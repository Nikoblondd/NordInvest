/*
 * The operating budget of an investment property (investeringsejendom), kept
 * apart from forecasts. Written after feedback from a professional investor
 * (Oct 2026): projecting the operation of an older rental building forward is
 * fragile (maintenance, rent rules, rising running costs), and professionals
 * answer for every number they show. So:
 *
 *  1. The seller's figures are shown as they are, each with its source.
 *  2. A prudent year 1 subtracts a visible maintenance allowance (by building
 *     age) and a rent-loss allowance, both editable.
 *  3. Sensitivity is measured on today's operation (how much may the operating
 *     result fall before the cash flow is gone), not on a forecast.
 *  4. Ten years appear only as three labelled scenarios where running costs
 *     grow at least as fast as rent. None of them is presented as a forecast.
 */

import { saleCosts } from "@/lib/dk-fees";

export type Source = "annonce" | "bbr" | "indtastet" | "beregnet" | "skøn";

export type OpsFacts = {
  price: number;
  /** Annual operating result (driftsresultat) from the seller: stated yield × price. */
  noi: number;
  /** Annual operating costs (driftsudgifter) from the seller's budget, if known. */
  opex: number | null;
  /** Annual gross rent typed by the user; otherwise operating result + operating costs. */
  rent?: number | null;
  area: number | null;
  builtYear: number | null;
  renovatedYear?: number | null;
  subcat: string | null;
  /** Where rent, opex, area and building year come from. */
  sources?: Partial<Record<"rent" | "opex" | "area" | "builtYear", Source>>;
};

export type Financing = { downPaymentPct: number; ratePct: number; termYears: number };

const RESIDENTIAL = new Set(["Boligudlejning", "Andre typer"]);
export const isResidential = (subcat: string | null) => !subcat || RESIDENTIAL.has(subcat);

/** Share of gross rent that goes to running costs, used only when the seller's costs are unknown. */
const OPEX_SHARE = (subcat: string | null) => (isResidential(subcat) ? 0.35 : 0.15);

/**
 * Prudent extra maintenance on top of the seller's budget, kr. per m² per year,
 * by the building's age. Older buildings carry roofs, facades, windows and
 * installations near the end of their life; sellers' budgets rarely show it.
 * Commercial leases often put more of the upkeep on the tenant, so half.
 */
export function maintenanceAllowance(builtYear: number | null, renovatedYear: number | null | undefined, subcat: string | null): number {
  const year = Math.max(builtYear ?? 0, renovatedYear && builtYear && renovatedYear > builtYear ? Math.round((builtYear + renovatedYear) / 2) : 0) || null;
  const base = year == null ? 75 : year < 1950 ? 100 : year < 1980 ? 75 : year < 2000 ? 50 : 25;
  return isResidential(subcat) ? base : Math.round(base / 2);
}

/** Rent lost to vacancy, bad debt and re-letting, % of gross rent. */
export const rentLossPct = (subcat: string | null) => (subcat === "Boligudlejning" ? 2 : isResidential(subcat) ? 3 : 5);

export type Budget = {
  rent: number; rentSource: Source;
  opex: number; opexSource: Source;
  noi: number;
  /** Prudent allowances (annual kr.). */
  maintenance: number; maintenancePerM2: number;
  rentLoss: number; rentLossPct: number;
  prudentNoi: number;
};

/** Year 1: the seller's budget and the prudent version. `allowancePerM2` and `lossPct` override the defaults. */
export function budget(f: OpsFacts, o: { allowancePerM2?: number | null; lossPct?: number | null } = {}): Budget {
  const s = f.sources ?? {};
  let rent: number, opex: number, rentSource: Source, opexSource: Source;
  if (f.rent && f.rent > 0) {
    rent = f.rent; rentSource = s.rent ?? "indtastet";
    opex = f.opex ?? rent - f.noi; opexSource = f.opex != null ? s.opex ?? "annonce" : "beregnet";
  } else if (f.opex != null && f.opex >= 0) {
    opex = f.opex; opexSource = s.opex ?? "annonce";
    rent = f.noi + opex; rentSource = "beregnet";
  } else {
    rent = f.noi / (1 - OPEX_SHARE(f.subcat)); rentSource = "skøn";
    opex = rent - f.noi; opexSource = "skøn";
  }
  const noi = rent - opex;
  const perM2 = o.allowancePerM2 ?? maintenanceAllowance(f.builtYear, f.renovatedYear, f.subcat);
  // Without an area, fall back to an allowance of 5 % of the rent.
  const maintenance = f.area ? perM2 * f.area : rent * 0.05;
  const lossPct = o.lossPct ?? rentLossPct(f.subcat);
  const rentLoss = rent * (lossPct / 100);
  return { rent, rentSource, opex, opexSource, noi, maintenance, maintenancePerM2: f.area ? perM2 : 0, rentLoss, rentLossPct: lossPct, prudentNoi: noi - maintenance - rentLoss };
}

export function payment(loan: number, ratePct: number, years: number): number {
  const r = ratePct / 100 / 12, n = years * 12;
  if (loan <= 0) return 0;
  return r === 0 ? loan / n : (loan * r) / (1 - Math.pow(1 + r, -n));
}
function balance(loan: number, ratePct: number, years: number, afterYears: number): number {
  const r = ratePct / 100 / 12, n = years * 12, p = Math.min(afterYears * 12, n);
  if (loan <= 0) return 0;
  if (r === 0) return loan * (1 - p / n);
  const f = Math.pow(1 + r, n), fp = Math.pow(1 + r, p);
  return Math.max(0, loan * ((f - fp) / (f - 1)));
}

export type Stress = { label: string; note: string; noi: number; cashFlow: number };

/** Year-1 sensitivity: what happens to the cash flow if today's operation turns out worse than the seller's budget. */
export function stress(b: Budget, price: number, fin: Financing): { rows: Stress[]; debtService: number; tolerancePct: number; toleranceKr: number } {
  const loan = price * (1 - fin.downPaymentPct / 100);
  const ds = payment(loan, fin.ratePct, fin.termYears) * 12;
  const ds2 = payment(loan, fin.ratePct + 2, fin.termYears) * 12;
  const row = (label: string, note: string, noi: number, debt = ds): Stress => ({ label, note, noi, cashFlow: noi - debt });
  const tenPctLoss = b.rent * 0.1;
  const opexUp = b.opex * 0.2;
  const rows = [
    row("Sælgers driftsbudget", "Lejeindtægt og driftsudgifter som i annoncen", b.noi),
    row("Ekstra vedligehold", b.maintenancePerM2 ? `${Math.round(b.maintenancePerM2)} kr. pr. m² om året ud over sælgers budget` : "5 % af lejen ud over sælgers budget", b.noi - b.maintenance),
    row("Lejetab og tomgang", `${b.rentLossPct.toLocaleString("da-DK")} % af lejen`, b.noi - b.rentLoss),
    row("Lejen 10 % lavere", "Fx en lejer, der fraflytter, eller en leje, der skal nedsættes", b.noi - tenPctLoss),
    row("Driftsudgifter 20 % højere", "Fx højere ejendomsskat, forsikring eller administration", b.noi - opexUp),
    row("Renten 2 procentpoint højere", "Samme driftsbudget, dyrere lån", b.noi, ds2),
    row("Det hele på én gang", "Vedligehold, lejetab, lavere leje, højere udgifter og rente", b.noi - b.maintenance - b.rentLoss - tenPctLoss - opexUp, ds2),
  ];
  const cf = b.noi - ds;
  return { rows, debtService: ds, tolerancePct: b.noi > 0 ? Math.max(0, (cf / b.noi) * 100) : 0, toleranceKr: Math.max(0, cf) };
}

export type ScenarioId = "forsigtig" | "middel" | "positiv";
export type Scenario = {
  id: ScenarioId; label: string;
  rentGrowth: number; opexGrowth: number; valueGrowth: number; prudent: boolean;
  years: { year: number; noi: number; cashFlow: number; balance: number; value: number }[];
  cashFlowY1: number; cashFlowY10: number; cumulative: number; paidDown: number; valueChange: number; saleCosts: number; buyCosts: number; total: number;
};

/** Default assumptions. Regulated rent in older residential buildings cannot simply follow inflation. */
export function scenarioAssumptions(f: OpsFacts): Record<ScenarioId, { label: string; rentGrowth: number; opexGrowth: number; valueGrowth: number; prudent: boolean }> {
  const oldResidential = f.subcat === "Boligudlejning" && (f.builtYear == null || f.builtYear < 1992);
  return {
    forsigtig: { label: "Forsigtig", rentGrowth: oldResidential ? 0 : 1, opexGrowth: 3, valueGrowth: 0, prudent: true },
    middel: { label: "Middel", rentGrowth: 1.5, opexGrowth: 2.5, valueGrowth: 1.5, prudent: true },
    positiv: { label: "Positiv", rentGrowth: 2, opexGrowth: 2, valueGrowth: 2.5, prudent: false },
  };
}

/** Ten years under each scenario. Maintenance and rent loss grow with costs and rent respectively. */
export function scenarios(f: OpsFacts, b: Budget, fin: Financing, years = 10): Scenario[] {
  const loan = f.price * (1 - fin.downPaymentPct / 100);
  const ds = payment(loan, fin.ratePct, fin.termYears) * 12;
  const a = scenarioAssumptions(f);
  return (Object.keys(a) as ScenarioId[]).map((id) => {
    const s = a[id];
    const rows: Scenario["years"] = [];
    let cum = 0;
    for (let y = 1; y <= years; y++) {
      const rent = b.rent * Math.pow(1 + s.rentGrowth / 100, y - 1);
      const opex = b.opex * Math.pow(1 + s.opexGrowth / 100, y - 1);
      const extra = s.prudent ? b.maintenance * Math.pow(1 + s.opexGrowth / 100, y - 1) + rent * (b.rentLossPct / 100) : 0;
      const noi = rent - opex - extra;
      const cf = noi - ds;
      cum += cf;
      rows.push({ year: y, noi, cashFlow: cf, balance: balance(loan, fin.ratePct, fin.termYears, y), value: f.price * Math.pow(1 + s.valueGrowth / 100, y) });
    }
    const last = rows[rows.length - 1];
    const sc = saleCosts(last.value).total;
    const valueChange = last.value - f.price;
    const paidDown = loan - last.balance;
    // Købsomkostninger (tinglysning, advokat, bank): 1,5 % of the price, as in the analysis.
    const buyCosts = f.price * 0.015;
    return {
      id, ...s, years: rows,
      cashFlowY1: rows[0].cashFlow, cashFlowY10: last.cashFlow, cumulative: cum, paidDown, valueChange, saleCosts: sc, buyCosts,
      total: cum + paidDown + valueChange - sc - buyCosts,
    };
  });
}

export type QualityItem = { label: string; ok: boolean; note: string };

/** What the analysis is built on, and what a professional still has to get before relying on it. */
export function dataQuality(f: OpsFacts): { items: QualityItem[]; known: number; level: "screening" | "delvis" } {
  const s = f.sources ?? {};
  const items: QualityItem[] = [
    { label: "Pris og afkast", ok: true, note: "Fra sælgers annonce" },
    { label: "Driftsudgifter", ok: f.opex != null, note: f.opex != null ? (s.opex === "indtastet" ? "Indtastet" : "Fra sælgers annonce, ikke specificeret") : "Mangler. Lejeindtægten er skønnet" },
    { label: "Areal", ok: f.area != null, note: f.area != null ? (s.area === "bbr" ? "Fra BBR" : s.area === "indtastet" ? "Indtastet" : "Fra annoncen") : "Mangler" },
    { label: "Byggeår", ok: f.builtYear != null, note: f.builtYear != null ? `${f.builtYear}${f.renovatedYear ? `, ombygget ${f.renovatedYear}` : ""} (${s.builtYear === "indtastet" ? "indtastet" : "BBR"})` : "Mangler. Vedligeholdelsestillægget er sat til middel" },
    { label: "Lejeliste og lejefastsættelse", ok: false, note: "Kræver lejekontrakter: omkostningsbestemt leje, § 5, stk. 2, eller fri leje" },
    { label: "Regnskab for de seneste 3 år", ok: false, note: "Kræver ejendommens regnskab fra sælger" },
    { label: "Vedligeholdelsesplan og teknisk gennemgang", ok: false, note: "Kræver byggeteknisk gennemgang eller plan for tag, facade, vinduer og installationer" },
  ];
  const known = items.filter((i) => i.ok).length;
  return { items, known, level: known >= 4 ? "delvis" : "screening" };
}

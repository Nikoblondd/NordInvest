import prices from "@/data/materialepriser.json";
import type { Element, Plan } from "@/lib/flip/plan";

/*
 * The flip model: from purchase to sale, every krone a Danish flip costs, and
 * what is left after tax. Pure functions, so the page recalculates on every
 * edit. Every line says where its number comes from: a real product price
 * (with a link), a 2026 trade hourly rate, a statutory fee, or an estimate the
 * user should check. Nothing is presented as more certain than it is.
 */

export type Role = "private" | "tradesman" | "contractor" | "pro_investor";
export type Diy = "none" | "paint_floors" | "most" | "all";
export type Level = "cosmetic" | "medium" | "total";
export type TaxCase = "live_in" | "private" | "business";
export type Finance = "cash" | "loan";

export type FlipAnswers = {
  strategy: "flip" | "live_flip";
  role: Role;
  diy: Diy;
  level: Level;
  months: number;
  finance: Finance;
  downPct: number; // when financed
  rate: number; // % a year
  sales: "0" | "1-2" | "3+"; // homes sold in the last 5 years
  target: number; // required profit, % of the sale price
};

export const DEFAULT_ANSWERS: FlipAnswers = {
  strategy: "flip",
  role: "private",
  diy: "none",
  level: "medium",
  months: 6,
  finance: "loan",
  downPct: 20,
  rate: 5,
  sales: "0",
  target: 15,
};

export type Property = {
  price: number;
  area: number;
  rooms: number | null;
  yearBuilt: number | null;
  zip: string;
  monthlyExpenses: number | null; // ejerudgift from the listing
  type: "villa" | "condo" | "terraced";
};

type Prod = { name: string; url: string; store: string; price: number; pack: number; unitPrice: number };
type Item = { label: string; unit: string; budget: number; standard: number; product: Prod; alternatives: Prod[] };
const P = (prices as unknown as { fetched: string; items: Record<string, Item> }).items;
export const PRICES_FETCHED = (prices as { fetched: string }).fetched;

export type Trade = "maler" | "tømrer" | "vvs" | "el" | "murer";
export const TRADE_LABEL: Record<Trade, string> = { maler: "Maler", tømrer: "Tømrer", vvs: "VVS", el: "Elektriker", murer: "Murer og fliser" };

// 2026 hourly rates excl. VAT by region (boligideen.dk, bygguiden.dk, better.dk
// price guides, Oct 2026). Private buyers pay VAT on top.
const RATES: Record<"kbh" | "sj" | "dk", Record<Trade, number>> = {
  kbh: { maler: 580, tømrer: 750, vvs: 780, el: 750, murer: 720 },
  sj: { maler: 500, tømrer: 650, vvs: 675, el: 650, murer: 640 },
  dk: { maler: 420, tømrer: 570, vvs: 580, el: 580, murer: 560 },
};
export function region(zip: string): "kbh" | "sj" | "dk" {
  const z = Number(zip);
  if (z < 3000) return "kbh";
  if (z < 5000) return "sj";
  return "dk";
}

export type Line = {
  id: string;
  element: Element;
  label: string;
  qty: number;
  unit: string;
  unitPrice: number; // materials per unit, incl. VAT
  hours: number;
  trade: Trade | null;
  source: "product" | "estimate";
  product?: Prod;
  alternatives?: Prod[];
  note?: string;
};

const DIY_SKIPS: Record<Diy, Trade[]> = {
  none: [],
  paint_floors: ["maler"],
  most: ["maler", "tømrer", "murer"],
  all: ["maler", "tømrer", "murer", "vvs", "el"],
};

/** The renovation, line by line, from the plan, scaled to the home's size. */
export function renovationLines(p: Property, plan: Plan): Line[] {
  const area = p.area;
  const rooms = Math.max(2, p.rooms ?? Math.round(area / 25));
  const L: Line[] = [];
  const add = (l: Omit<Line, "source" | "product" | "alternatives" | "unitPrice"> & { key?: string; unitPrice?: number }) => {
    const it = l.key ? P[l.key] : undefined;
    const { key: _k, ...rest } = l;
    void _k;
    L.push({ ...rest, unitPrice: it?.budget ?? l.unitPrice ?? 0, source: it ? "product" : "estimate", product: it?.product, alternatives: it?.alternatives });
  };
  const paintM2 = Math.round(area * 3.5); // walls and ceilings
  const bath = area < 80 ? 4 : 5;
  const wallTiles = Math.round(Math.sqrt(bath) * 4 * 2.2);
  const run = p.type === "condo" ? 3 : 4;

  // Walls and ceilings: two coats; a replace also gets filling and sanding.
  if (plan.vaegge !== "keep") {
    add({ id: "maling", key: "vaegmaling", element: "vaegge", label: "Maling af vægge og lofter, 2 gange", qty: Math.ceil((paintM2 * 2) / 8), unit: "liter", unitPrice: 70, hours: Math.round(paintM2 / 9), trade: "maler" });
    if (plan.vaegge === "replace") add({ id: "spartel", key: "spartel", element: "vaegge", label: "Spartling og slibning", qty: Math.ceil(area * 0.25), unit: "liter", unitPrice: 22, hours: Math.round(area * 0.15), trade: "maler" });
  }

  const floorM2 = Math.round(area * 0.8 * 1.1);
  if (plan.gulve === "replace") {
    add({ id: "gulv", key: "laminat", element: "gulve", label: "Nyt gulv i opholdsrum (laminat)", qty: floorM2, unit: "m²", unitPrice: 95, hours: Math.round(floorM2 * 0.35), trade: "tømrer" });
    add({ id: "fodliste", key: "fodliste", element: "gulve", label: "Fodlister", qty: Math.ceil((rooms * 14) / 1.2), unit: "stk.", unitPrice: 66, hours: Math.round(rooms * 1.2), trade: "tømrer" });
  } else if (plan.gulve === "refresh") {
    add({ id: "slibning", element: "gulve", label: "Afslibning og lakering af trægulve", qty: Math.round(area * 0.8), unit: "m²", unitPrice: 35, hours: Math.round(area * 0.8 * 0.3), trade: "tømrer", note: "Skøn: lak og slibepapir ca. 35 kr. pr. m²" });
  }

  if (plan.doere === "replace") add({ id: "doere", key: "indvdoer", element: "doere", label: "Nye indvendige døre", qty: rooms + 1, unit: "stk.", unitPrice: 1700, hours: (rooms + 1) * 2, trade: "tømrer" });
  else if (plan.doere === "refresh") add({ id: "doere-mal", element: "doere", label: "Maling af døre og karme", qty: rooms + 1, unit: "stk.", unitPrice: 60, hours: (rooms + 1) * 1.5, trade: "maler", note: "Skøn: maling og grunder pr. dør" });

  if (plan.koekken === "replace") {
    add({ id: "koekken-skabe", element: "koekken", label: `Køkkenskabe og fronter (${run} løbende meter)`, qty: run, unit: "lbm", unitPrice: 4500, hours: run * 3, trade: "tømrer", note: "Skøn: budgetkøkken fra byggemarked, ca. 4.500 kr. pr. løbende meter" });
    add({ id: "bordplade", key: "bordplade", element: "koekken", label: "Bordplade", qty: 1, unit: "stk.", unitPrice: 900, hours: 3, trade: "tømrer" });
    add({ id: "vask", key: "koekkenvask", element: "koekken", label: "Køkkenvask", qty: 1, unit: "stk.", unitPrice: 600, hours: 2, trade: "vvs" });
    add({ id: "armatur", key: "koekkenarmatur", element: "koekken", label: "Køkkenarmatur", qty: 1, unit: "stk.", unitPrice: 600, hours: 1, trade: "vvs" });
    add({ id: "hvidevarer", element: "koekken", label: "Hvidevarer (ovn, kogeplade, emhætte, opvasker, køleskab)", qty: 1, unit: "sæt", unitPrice: 14000, hours: 4, trade: "el", note: "Skøn: budgetpakke med 5 hvidevarer" });
  } else if (plan.koekken === "refresh") {
    add({ id: "fronter", element: "koekken", label: `Nye fronter og greb (${run} løbende meter)`, qty: run, unit: "lbm", unitPrice: 1500, hours: run * 2, trade: "tømrer", note: "Skøn: nye låger og greb på eksisterende skabe" });
    add({ id: "bordplade", key: "bordplade", element: "koekken", label: "Ny bordplade", qty: 1, unit: "stk.", unitPrice: 900, hours: 3, trade: "tømrer" });
    add({ id: "armatur", key: "koekkenarmatur", element: "koekken", label: "Køkkenarmatur", qty: 1, unit: "stk.", unitPrice: 600, hours: 1, trade: "vvs" });
  }

  if (plan.bad === "replace") {
    add({ id: "vaegfliser", key: "vaegflise", element: "bad", label: "Vægfliser", qty: Math.round(wallTiles * 1.1), unit: "m²", unitPrice: 250, hours: Math.round(wallTiles * 1.2), trade: "murer" });
    add({ id: "gulvfliser", key: "gulvflise", element: "bad", label: "Gulvfliser", qty: Math.round(bath * 1.1), unit: "m²", unitPrice: 280, hours: Math.round(bath * 1.5), trade: "murer" });
    add({ id: "klaeb", key: "fliseklaeb", element: "bad", label: "Fliseklæb, 20 kg", qty: Math.ceil((wallTiles + bath) / 4), unit: "sække", unitPrice: 230, hours: 0, trade: null });
    add({ id: "membran", element: "bad", label: "Vådrumsmembran og fuge", qty: wallTiles + bath, unit: "m²", unitPrice: 90, hours: Math.round((wallTiles + bath) * 0.3), trade: "murer", note: "Skøn: vådrumssikring efter SBi-anvisning 252 kræver et godkendt system" });
  }
  if (plan.bad !== "keep") {
    add({ id: "toilet", key: "toilet", element: "bad", label: "Toilet", qty: 1, unit: "stk.", unitPrice: 1500, hours: 3, trade: "vvs" });
    add({ id: "badmoebel", key: "badmoebel", element: "bad", label: "Badeværelsesmøbel med vask", qty: 1, unit: "stk.", unitPrice: 1600, hours: 3, trade: "vvs" });
    add({ id: "bruser", key: "brusesaet", element: "bad", label: "Brusesæt med termostat", qty: 1, unit: "stk.", unitPrice: 400, hours: 2, trade: "vvs" });
    add({ id: "brusevaeg", key: "brusevaeg", element: "bad", label: "Brusevæg", qty: 1, unit: "stk.", unitPrice: 750, hours: 2, trade: "vvs" });
  }

  if (plan.el !== "keep") {
    add({ id: "stik", key: "stikkontakt", element: "el", label: "Stikkontakter og afbrydere", qty: rooms * 3, unit: "stk.", unitPrice: 40, hours: Math.round(rooms * 1.2), trade: "el" });
    add({ id: "lamper", key: "loftlampe", element: "el", label: "Loftlamper", qty: rooms, unit: "stk.", unitPrice: 180, hours: rooms, trade: "el" });
  }
  if (plan.el === "replace") add({ id: "el-total", element: "el", label: "Ny el-installation og tavle", qty: area, unit: "m²", unitPrice: 250, hours: Math.round(area * 0.35), trade: "el", note: "Skøn: kabler, tavle, HPFI og elinstallationsrapport" });

  if (plan.varme === "replace") add({ id: "vvs-total", element: "varme", label: "Varme- og vandinstallationer", qty: area, unit: "m²", unitPrice: 300, hours: Math.round(area * 0.25), trade: "vvs", note: "Skøn: rør, radiatorer, varmtvandsbeholder" });
  else if (plan.varme === "refresh") add({ id: "vvs-service", element: "varme", label: "Service, nye termostater og udluftning", qty: rooms, unit: "radiatorer", unitPrice: 250, hours: rooms, trade: "vvs", note: "Skøn: termostathoveder og service" });

  const windows = Math.round(area / 12);
  if (plan.vinduer === "replace") add({ id: "vinduer", element: "vinduer", label: "Nye vinduer og yderdøre", qty: windows, unit: "stk.", unitPrice: 6500, hours: windows * 4, trade: "tømrer", note: "Skøn: standardvindue med 2-lags energiglas" });
  else if (plan.vinduer === "refresh") add({ id: "vinduer-mal", element: "vinduer", label: "Maling og nye fuger ved vinduer", qty: windows, unit: "stk.", unitPrice: 250, hours: windows * 1.5, trade: "maler", note: "Skøn: maling og fugemasse pr. vindue" });

  const roofM2 = Math.round((p.type === "condo" ? 0 : area * 1.25));
  if (roofM2 && plan.tag === "replace") add({ id: "tag", element: "tag", label: "Nyt tag", qty: roofM2, unit: "m²", unitPrice: 650, hours: Math.round(roofM2 * 0.6), trade: "tømrer", note: "Skøn: tagsten eller tagpap inkl. undertag, ca. 650 kr. pr. m² i materialer" });
  else if (roofM2 && plan.tag === "refresh") add({ id: "tag-rep", element: "tag", label: "Tagrens, reparation og inddækninger", qty: 1, unit: "job", unitPrice: 6000, hours: 24, trade: "tømrer", note: "Skøn" });

  const facadeM2 = Math.round(p.type === "condo" ? 0 : Math.sqrt(area) * 4 * 2.6);
  if (facadeM2 && plan.facade === "replace") add({ id: "facade", element: "facade", label: "Facaderenovering (puds/fuger og maling)", qty: facadeM2, unit: "m²", unitPrice: 180, hours: Math.round(facadeM2 * 0.5), trade: "murer", note: "Skøn" });
  else if (facadeM2 && plan.facade === "refresh") add({ id: "facade-mal", element: "facade", label: "Rens og maling af facade og træværk", qty: facadeM2, unit: "m²", unitPrice: 45, hours: Math.round(facadeM2 * 0.25), trade: "maler", note: "Skøn: facademaling og rens" });
  return L;
}

export type Phase = { label: string; trade: Trade; weeks: number; start: number };

/** A week plan: one crew per trade, in the order a renovation runs. */
export function timeline(lines: Line[]): { phases: Phase[]; weeks: number } {
  const hours: Partial<Record<Trade, number>> = {};
  for (const l of lines) if (l.trade) hours[l.trade] = (hours[l.trade] ?? 0) + l.hours;
  const order: { trade: Trade; label: string; overlap: number }[] = [
    { trade: "el", label: "El, første fase", overlap: 0 },
    { trade: "vvs", label: "VVS", overlap: 0.5 },
    { trade: "tømrer", label: "Tømrer", overlap: 0.3 },
    { trade: "murer", label: "Fliser og murer", overlap: 0.2 },
    { trade: "maler", label: "Maler", overlap: 0 },
  ];
  const phases: Phase[] = [];
  let t = 0;
  for (const o of order) {
    const h = hours[o.trade] ?? 0;
    if (!h) continue;
    const w = Math.max(0.5, Math.round((h / 37) * 2) / 2);
    const start = Math.max(0, t - (phases.length ? phases[phases.length - 1].weeks * o.overlap : 0));
    phases.push({ label: o.label, trade: o.trade, weeks: w, start });
    t = start + w;
  }
  return { phases, weeks: Math.ceil(t) };
}

export type Purchase = { store: string; name: string; url: string; packs: number; price: number; total: number; line: string };

/** What to buy where: whole packs of the chosen product for every priced line. */
export function shoppingList(lines: Line[]): { stores: { store: string; items: Purchase[]; total: number }[]; total: number } {
  const by = new Map<string, Purchase[]>();
  for (const l of lines) {
    if (!l.product || !l.qty) continue;
    const packs = Math.ceil(l.qty / (l.product.pack || 1));
    const item: Purchase = { store: l.product.store, name: l.product.name, url: l.product.url, packs, price: l.product.price, total: packs * l.product.price, line: l.label };
    by.set(item.store, [...(by.get(item.store) ?? []), item]);
  }
  const stores = Array.from(by.entries()).map(([store, items]) => ({ store, items, total: items.reduce((s, i) => s + i.total, 0) })).sort((a, b) => b.total - a.total);
  return { stores, total: stores.reduce((s, x) => s + x.total, 0) };
}

export type Costs = {
  materials: number;
  labour: number;
  labourByTrade: Partial<Record<Trade, number>>;
  diyHours: number;
  buffer: number;
  renovation: number;
};

const VAT = 1.25;

export function renovationCost(lines: Line[], p: Property, a: FlipAnswers): Costs {
  const rates = RATES[region(p.zip)];
  const skip = new Set(DIY_SKIPS[a.diy]);
  // Tradesmen and contractors buy at trade prices; their own labour is free here.
  const matFactor = a.role === "tradesman" || a.role === "contractor" ? 0.85 : 1;
  let materials = 0;
  let labour = 0;
  let diyHours = 0;
  const byTrade: Partial<Record<Trade, number>> = {};
  for (const l of lines) {
    materials += l.qty * l.unitPrice * matFactor;
    if (!l.trade || !l.hours) continue;
    if (skip.has(l.trade) || (a.role === "contractor" && l.trade !== "el" && l.trade !== "vvs")) {
      diyHours += l.hours;
      continue;
    }
    const cost = l.hours * rates[l.trade] * VAT;
    labour += cost;
    byTrade[l.trade] = (byTrade[l.trade] ?? 0) + cost;
  }
  // Hidden faults: 10 % on a cosmetic job, 15 % medium, 20 % total.
  const bufPct = a.level === "cosmetic" ? 0.1 : a.level === "medium" ? 0.15 : 0.2;
  const buffer = (materials + labour) * bufPct;
  return { materials, labour, labourByTrade: byTrade, diyHours, buffer, renovation: materials + labour + buffer };
}

export type Waterfall = { label: string; value: number; kind: "start" | "cost" | "end" | "tax" | "result"; note?: string }[];

export type FlipResult = {
  arv: number;
  costs: Costs;
  buy: { tinglysning: number; pant: number; lawyer: number; total: number };
  hold: { interest: number; running: number; total: number; months: number };
  sell: { broker: number; reports: number; other: number; total: number };
  equity: number; // own cash tied up
  loan: number;
  profitBeforeTax: number;
  taxCase: TaxCase;
  tax: number;
  taxByCase: Record<TaxCase, number>;
  profit: number;
  roi: number; // on own cash
  annualised: number;
  margin: number; // profit / ARV
  maxBid: number;
  breakEvenArv: number;
  waterfall: Waterfall;
};

export function taxCaseFor(a: FlipAnswers): TaxCase {
  if (a.strategy === "live_flip") return "live_in";
  if (a.sales === "3+" || a.role === "contractor" || a.role === "pro_investor") return "business";
  return "private";
}

function run(price: number, arv: number, p: Property, a: FlipAnswers, renovation: Costs): Omit<FlipResult, "maxBid" | "breakEvenArv" | "waterfall"> {
  const loan = a.finance === "loan" ? price * (1 - a.downPct / 100) : 0;
  const tinglysning = 1850 + price * 0.006; // skøde: 1.850 kr. + 0,6 %
  const pant = loan > 0 ? 1825 + loan * 0.0125 : 0; // pantebrev: 1.825 kr. + 1,25 % (fra 1.1.2026)
  const lawyer = 12000; // køberrådgiver/advokat, skøn
  const buyTotal = tinglysning + pant + lawyer;

  const months = a.months;
  const interest = (loan * (a.rate / 100) * months) / 12;
  const running = (p.monthlyExpenses ?? Math.round(p.area * 30)) * months + 1200 * months; // ejerudgift + forbrug
  const holdTotal = interest + running;

  const broker = Math.max(35000, arv * 0.015); // salær, skøn
  const reports = 15000; // tilstandsrapport + elinstallationsrapport
  const other = 20000; // markedsføring, halv ejerskifteforsikring, sælgers advokat
  const sellTotal = broker + reports + other;

  const totalCost = price + buyTotal + renovation.renovation + holdTotal + sellTotal;
  const profitBeforeTax = arv - totalCost;
  const years = Math.max(months / 12, 1 / 12);

  // Private sale (ejendomsavancebeskatningsloven): the gain is the sale price
  // minus selling costs, purchase price, buying costs and improvements, less a
  // 10.000 kr. allowance per year owned, taxed as capital income at up to 42 %.
  // Interest and running costs are not part of the gain; interest is deducted
  // separately as negative capital income, worth about 33 %.
  const avance = arv - sellTotal - (price + buyTotal) - renovation.renovation - 10000 * Math.ceil(years);
  const taxByCase: Record<TaxCase, number> = {
    live_in: 0, // parcelhusreglen
    private: Math.max(0, Math.max(0, avance) * 0.42 - interest * 0.33),
    business: Math.max(0, profitBeforeTax) * 0.52, // personlig indkomst inkl. topskat, vejledende
  };
  const taxCase = taxCaseFor(a);
  const tax = taxByCase[taxCase];
  const profit = profitBeforeTax - tax;
  const equity = price - loan + buyTotal + renovation.renovation + holdTotal;
  const roi = equity > 0 ? profit / equity : 0;
  return {
    arv,
    costs: renovation,
    buy: { tinglysning, pant, lawyer, total: buyTotal },
    hold: { interest, running, total: holdTotal, months },
    sell: { broker, reports, other, total: sellTotal },
    equity,
    loan,
    profitBeforeTax,
    taxCase,
    tax,
    taxByCase,
    profit,
    roi,
    annualised: Math.pow(1 + Math.max(-0.99, roi), 1 / years) - 1,
    margin: arv > 0 ? profit / arv : 0,
  };
}

export function flip(p: Property, arv: number, a: FlipAnswers, lines: Line[]): FlipResult {
  const renovation = renovationCost(lines, p, a);
  const base = run(p.price, arv, p, a, renovation);

  // Max bid: the highest price that still leaves the target margin after tax.
  let lo = 0;
  let hi = arv;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (run(mid, arv, p, a, renovation).margin >= a.target / 100) lo = mid;
    else hi = mid;
  }
  // Break-even: the sale price where profit after tax is zero.
  let bl = 0;
  let bh = arv * 3;
  for (let i = 0; i < 40; i++) {
    const mid = (bl + bh) / 2;
    if (run(p.price, mid, p, a, renovation).profit >= 0) bh = mid;
    else bl = mid;
  }

  const waterfall: Waterfall = [
    { label: "Salgspris efter renovering", value: arv, kind: "start" },
    { label: "Købspris", value: -p.price, kind: "cost" },
    { label: "Købsomkostninger", value: -base.buy.total, kind: "cost", note: "Tinglysning, pant, rådgiver" },
    { label: "Renovering", value: -renovation.renovation, kind: "cost", note: "Materialer, håndværkere, buffer" },
    { label: `Ejertid, ${a.months} mdr.`, value: -base.hold.total, kind: "cost", note: "Renter, ejerudgift, forbrug" },
    { label: "Salgsomkostninger", value: -base.sell.total, kind: "cost", note: "Mægler, rapporter, markedsføring" },
    { label: "Skat", value: -base.tax, kind: "tax" },
    { label: "Fortjeneste efter skat", value: base.profit, kind: "result" },
  ];
  return { ...base, maxBid: Math.floor(lo / 5000) * 5000, breakEvenArv: Math.ceil(bh / 5000) * 5000, waterfall };
}

/** Profit after tax when the sale price, the renovation or the timeline goes wrong. */
export function stress(p: Property, arv: number, a: FlipAnswers, lines: Line[]) {
  const cell = (arvF: number, renoF: number, extraMonths: number) => {
    const scaled = lines.map((l) => ({ ...l, unitPrice: l.unitPrice * renoF, hours: l.hours * renoF }));
    return flip(p, arv * arvF, { ...a, months: a.months + extraMonths }, scaled).profit;
  };
  return {
    rows: [
      { label: "Som planlagt", values: [cell(1, 1, 0), cell(1, 1.2, 0), cell(1, 1.4, 3)] },
      { label: "Salgspris −5 %", values: [cell(0.95, 1, 0), cell(0.95, 1.2, 0), cell(0.95, 1.4, 3)] },
      { label: "Salgspris −10 %", values: [cell(0.9, 1, 0), cell(0.9, 1.2, 0), cell(0.9, 1.4, 3)] },
    ],
    cols: ["Budget holder", "Renovering +20 %", "+40 % og 3 mdr. forsinkelse"],
  };
}

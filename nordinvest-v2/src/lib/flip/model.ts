import prices from "@/data/materialepriser.json";

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

type Item = { label: string; unit: string; budget: number; standard: number; product: { name: string; url: string; store: string; price: number } };
const P = (prices as { fetched: string; items: Record<string, Item> }).items;
export const PRICES_FETCHED = (prices as { fetched: string }).fetched;

export type Trade = "maler" | "tømrer" | "vvs" | "el" | "murer";

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
  group: "Maling" | "Gulve" | "Døre" | "Køkken" | "Bad" | "El" | "Klimaskærm og installationer";
  label: string;
  qty: number;
  unit: string;
  unitPrice: number; // materials per unit, incl. VAT
  hours: number;
  trade: Trade | null;
  source: "product" | "estimate";
  product?: Item["product"];
  note?: string;
};

const DIY_SKIPS: Record<Diy, Trade[]> = {
  none: [],
  paint_floors: ["maler"],
  most: ["maler", "tømrer", "murer"],
  all: ["maler", "tømrer", "murer", "vvs", "el"],
};

/** The renovation, line by line, scaled to the home's size and the chosen level. */
export function renovationLines(p: Property, a: FlipAnswers): Line[] {
  const area = p.area;
  const rooms = Math.max(2, p.rooms ?? Math.round(area / 25));
  const L: Line[] = [];
  const prod = (k: string) => P[k];
  const add = (l: Omit<Line, "source"> & { key?: string }) => {
    const it = l.key ? prod(l.key) : undefined;
    L.push({ ...l, source: it ? "product" : "estimate", product: it?.product });
  };

  // Paint: walls and ceilings are roughly 3.5 m² per m² floor; two coats, 8 m² a litre.
  const paintM2 = Math.round(area * 3.5);
  const vm = prod("vaegmaling");
  add({ id: "maling", key: "vaegmaling", group: "Maling", label: "Vægge og lofter, 2 gange", qty: Math.ceil((paintM2 * 2) / 8), unit: "liter", unitPrice: vm?.budget ?? 70, hours: Math.round(paintM2 / 9), trade: "maler" });
  if (a.level !== "cosmetic") {
    const sp = prod("spartel");
    add({ id: "spartel", key: "spartel", group: "Maling", label: "Spartling og forarbejde", qty: Math.ceil(area * 0.25), unit: "liter", unitPrice: sp?.budget ?? 22, hours: Math.round(area * 0.15), trade: "maler" });
  }

  // Floors in the dry rooms (about 80 % of the area), 10 % waste.
  const floorM2 = Math.round(area * 0.8 * 1.1);
  const lam = prod("laminat");
  add({ id: "gulv", key: "laminat", group: "Gulve", label: "Nyt gulv i opholdsrum (laminat)", qty: floorM2, unit: "m²", unitPrice: lam?.budget ?? 95, hours: Math.round(floorM2 * 0.35), trade: "tømrer" });
  const fl = prod("fodliste");
  add({ id: "fodliste", key: "fodliste", group: "Gulve", label: "Fodlister", qty: Math.ceil((rooms * 14) / 1.2), unit: "stk.", unitPrice: fl?.budget ?? 66, hours: Math.round(rooms * 1.2), trade: "tømrer" });

  if (a.level !== "cosmetic") {
    const d = prod("indvdoer");
    add({ id: "doere", key: "indvdoer", group: "Døre", label: "Indvendige døre", qty: rooms + 1, unit: "stk.", unitPrice: d?.budget ?? 1700, hours: (rooms + 1) * 2, trade: "tømrer" });

    // Kitchen: worktop, sink and tap are real products; cabinets are an
    // estimate per running metre for a budget kitchen (no reliable public price).
    const run = p.type === "condo" ? 3 : 4;
    add({ id: "koekken-skabe", group: "Køkken", label: `Køkkenskabe og fronter, budget (${run} løbende meter)`, qty: run, unit: "lbm", unitPrice: 4500, hours: run * 3, trade: "tømrer", note: "Skøn: budgetkøkken fra byggemarked, ca. 4.500 kr. pr. løbende meter" });
    const bp = prod("bordplade");
    add({ id: "bordplade", key: "bordplade", group: "Køkken", label: "Bordplade", qty: 1, unit: "stk.", unitPrice: bp?.budget ?? 900, hours: 3, trade: "tømrer" });
    const kv = prod("koekkenvask");
    add({ id: "vask", key: "koekkenvask", group: "Køkken", label: "Køkkenvask", qty: 1, unit: "stk.", unitPrice: kv?.budget ?? 600, hours: 2, trade: "vvs" });
    const ka = prod("koekkenarmatur");
    add({ id: "armatur", key: "koekkenarmatur", group: "Køkken", label: "Køkkenarmatur", qty: 1, unit: "stk.", unitPrice: ka?.budget ?? 600, hours: 1, trade: "vvs" });
    add({ id: "hvidevarer", group: "Køkken", label: "Hvidevarer (ovn, kogeplade, emhætte, opvasker, køleskab)", qty: 1, unit: "sæt", unitPrice: 14000, hours: 4, trade: "el", note: "Skøn: budgetpakke med 5 hvidevarer" });

    // Bathroom about 5 m² (4 in small flats): tiles, membrane, sanitary ware.
    const bath = area < 80 ? 4 : 5;
    const wallTiles = Math.round(Math.sqrt(bath) * 4 * 2.2);
    const vf = prod("vaegflise");
    add({ id: "vaegfliser", key: "vaegflise", group: "Bad", label: "Vægfliser", qty: Math.round(wallTiles * 1.1), unit: "m²", unitPrice: vf?.budget ?? 250, hours: Math.round(wallTiles * 1.2), trade: "murer" });
    const gf = prod("gulvflise");
    add({ id: "gulvfliser", key: "gulvflise", group: "Bad", label: "Gulvfliser", qty: Math.round(bath * 1.1), unit: "m²", unitPrice: gf?.budget ?? 280, hours: Math.round(bath * 1.5), trade: "murer" });
    const fk = prod("fliseklaeb");
    add({ id: "klaeb", key: "fliseklaeb", group: "Bad", label: "Fliseklæb, 20 kg", qty: Math.ceil((wallTiles + bath) / 4), unit: "sække", unitPrice: fk?.budget ?? 230, hours: 0, trade: null });
    add({ id: "membran", group: "Bad", label: "Vådrumsmembran og fuge", qty: wallTiles + bath, unit: "m²", unitPrice: 90, hours: Math.round((wallTiles + bath) * 0.3), trade: "murer", note: "Skøn: vådrumssikring efter SBi-anvisning 252 kræver godkendt system" });
    const t = prod("toilet");
    add({ id: "toilet", key: "toilet", group: "Bad", label: "Toilet", qty: 1, unit: "stk.", unitPrice: t?.budget ?? 1500, hours: 3, trade: "vvs" });
    const bm = prod("badmoebel");
    add({ id: "badmoebel", key: "badmoebel", group: "Bad", label: "Badeværelsesmøbel med vask", qty: 1, unit: "stk.", unitPrice: bm?.budget ?? 1600, hours: 3, trade: "vvs" });
    const bs = prod("brusesaet");
    add({ id: "bruser", key: "brusesaet", group: "Bad", label: "Brusesæt med termostat", qty: 1, unit: "stk.", unitPrice: bs?.budget ?? 400, hours: 3, trade: "vvs" });
    const bv = prod("brusevaeg");
    add({ id: "brusevaeg", key: "brusevaeg", group: "Bad", label: "Brusevæg", qty: 1, unit: "stk.", unitPrice: bv?.budget ?? 750, hours: 2, trade: "vvs" });

    const so = prod("stikkontakt");
    add({ id: "stik", key: "stikkontakt", group: "El", label: "Stikkontakter og afbrydere", qty: rooms * 3, unit: "stk.", unitPrice: so?.budget ?? 40, hours: Math.round(rooms * 1.2), trade: "el" });
    const lo = prod("loftlampe");
    add({ id: "lamper", key: "loftlampe", group: "El", label: "Loftlamper", qty: rooms, unit: "stk.", unitPrice: lo?.budget ?? 180, hours: rooms, trade: "el" });
  }

  if (a.level === "total") {
    add({ id: "el-total", group: "El", label: "Ny el-installation og tavle", qty: area, unit: "m²", unitPrice: 250, hours: Math.round(area * 0.35), trade: "el", note: "Skøn: kabler, tavle, HPFI og elinstallationsrapport" });
    add({ id: "vvs-total", group: "Klimaskærm og installationer", label: "Varme- og vandinstallationer", qty: area, unit: "m²", unitPrice: 300, hours: Math.round(area * 0.25), trade: "vvs", note: "Skøn: rør, radiatorer, varmtvandsbeholder" });
    add({ id: "vinduer", group: "Klimaskærm og installationer", label: "Udskiftning af vinduer og yderdøre", qty: Math.round(area / 12), unit: "stk.", unitPrice: 6500, hours: Math.round(area / 12) * 4, trade: "tømrer", note: "Skøn: standardvindue 2-lags energiglas" });
  }
  return L;
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

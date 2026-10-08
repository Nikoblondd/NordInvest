"use client";

import { analyze, type AnalysisInput, type AnalysisResult } from "@/lib/analysis";
import { gainTax, purchaseCosts } from "@/lib/dk-fees";
import { parentsView } from "@/lib/parents";
import { Sheet, type SheetRow } from "@/components/sheet/Sheet";
import { Scenarios, scenarioSummary, type ScenarioColumn } from "@/components/sheet/Scenarios";

/*
 * Udlejning and forældrekøb as one sheet: købspris down to what the home
 * leaves every month and after the years you own it. A forældrekøb reads
 * differently: the tenant is your child, the rent must match the market, and
 * the point is the rent that stays in the family.
 */

const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const krMd = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr./md.`;
const pct = (n: number, d = 1) => `${n.toLocaleString("da-DK", { minimumFractionDigits: d, maximumFractionDigits: d })} %`;
const signed = (n: number, unit = " kr.") => `${n > 0 ? "+" : ""}${Math.round(n).toLocaleString("da-DK")}${unit}`;

type Inputs = Required<Pick<AnalysisInput, "price" | "monthlyRent" | "downPaymentPct" | "interestRate" | "termYears" | "monthlyOpex" | "vacancyPct" | "maintenancePct" | "acqCostPct" | "appreciationPct" | "rentGrowthPct" | "holdYears">> & AnalysisInput;

export function RentalSheet({
  inputs,
  r,
  set,
  goal,
  rentEstimated,
  marketRent,
  acqTouched,
  onExport,
  exporting,
}: {
  inputs: Inputs;
  r: AnalysisResult;
  set: (patch: Partial<Inputs>) => void;
  goal: "cashflow" | "parents";
  rentEstimated: boolean;
  marketRent: number | null;
  acqTouched: boolean;
  onExport: () => void;
  exporting: boolean;
}) {
  const parents = goal === "parents";
  const cash = inputs.downPaymentPct >= 100;
  const fees = purchaseCosts(inputs.price, r.loan);
  const acq = r.cashInvested - r.downPayment;
  const interest1 = (r.loan * inputs.interestRate) / 100 / 12;
  const principal1 = Math.max(0, r.monthlyMortgage - interest1);
  const beforePrincipal = r.noi / 12 - interest1;
  const years = r.holdYears;
  const last = r.projection[r.projection.length - 1];
  const endBalance = last ? last.loanBalance : r.loan;
  const sellCosts = r.saleValue * (r.saleCostsPct / 100);
  const rentTotal = last ? last.cumulativeCashFlow : 0;
  const { tax } = gainTax(r.saleValue, sellCosts, inputs.price, acq, 0, years);
  const afterTax = r.totalProfit - tax;
  const lowRent = parents && marketRent != null && inputs.monthlyRent < marketRent * 0.85;
  const familyRent = inputs.monthlyRent * 12 * years;
  const pv = parentsView(inputs, r);

  const rows: SheetRow[] = [
    { kind: "head", label: "Køb" },
    { kind: "row", key: "price", label: "Købspris", value: inputs.price, formula: "Udbudsprisen. Skriv dit bud for at se, hvad det gør.", input: { value: inputs.price, set: (n) => set({ price: n }), suffix: "kr." } },
    { kind: "row", key: "down", label: "Udbetaling", value: inputs.downPaymentPct, formula: "Din egen andel af købsprisen. 100 % er kontant køb. Realkredit låner højst 80 % i en ejerbolig.", input: { value: inputs.downPaymentPct, set: (n) => set({ downPaymentPct: Math.max(0, Math.min(100, n)) }), suffix: "%" } },
    ...(acqTouched
      ? [{ kind: "row" as const, key: "acq", label: "Købsomkostninger", value: acq, formula: `= ${pct(inputs.acqCostPct)} af købsprisen, som du har sat under Justér` }]
      : [
          { kind: "row" as const, key: "skoede", label: "Tinglysning af skøde", value: fees.skoede, formula: "= 1.850 kr. + 0,6 % × købspris" },
          { kind: "row" as const, key: "pant", label: "Tinglysning af pantebrev", value: fees.pant, formula: cash ? "Intet lån, intet pantebrev" : "= 1.825 kr. + 1,25 % × lån (satsen fra 1.1.2026)" },
          { kind: "row" as const, key: "lawyer", label: "Køberrådgiver", value: fees.lawyer, formula: "Skøn for advokat eller køberrådgiver" },
        ]),
    { kind: "row", key: "equity", label: "Din egen kapital", value: r.cashInvested, formula: "= udbetaling + købsomkostninger", strong: true },

    { kind: "head", label: parents ? "Barnets husleje" : "Leje" },
    {
      kind: "row",
      key: "rent",
      label: parents ? "Barnets husleje" : "Leje",
      value: inputs.monthlyRent,
      formula: parents ? "Det, dit barn betaler jer hver måned." : rentEstimated ? "Vores skøn for postnummeret og boligens størrelse. Store boliger tæller lavere pr. m². Ret den, hvis du kender lejen." : "Lejen fra annoncen eller dine svar.",
      input: { value: inputs.monthlyRent, set: (n) => set({ monthlyRent: n }), suffix: "kr./md." },
    },
    ...(parents && marketRent != null
      ? [{
          kind: "row" as const,
          key: "market",
          label: "Markedsleje for boligen",
          value: marketRent,
          tone: lowRent ? ("warn" as const) : undefined,
          formula: lowRent
            ? "Barnets husleje ligger under markedslejen. Lejen skal svare til, hvad en fremmed ville betale, ellers kan Skattestyrelsen beskatte jer, som om I fik markedslejen."
            : "Vores skøn for postnummeret og størrelsen. Barnets husleje skal svare til markedslejen, ellers kan Skattestyrelsen beskatte forskellen.",
        }]
      : []),
    ...(parents
      ? []
      : [{ kind: "row" as const, key: "vacancy", label: "Tomgang", value: inputs.vacancyPct, formula: "Andel af året uden lejer. 8 % er en måned om året.", input: { value: inputs.vacancyPct, set: (n: number) => set({ vacancyPct: Math.max(0, Math.min(50, n)) }), suffix: "%", decimals: 1 } }]),
    { kind: "row", key: "maint", label: "Vedligehold", value: inputs.maintenancePct, formula: "Andel af lejen sat af til vedligehold og udskiftninger. 6 % for en nyistandsat bolig, 14 % for en, der trænger.", input: { value: inputs.maintenancePct, set: (n) => set({ maintenancePct: Math.max(0, Math.min(40, n)) }), suffix: "%" } },
    { kind: "row", key: "opex", label: "Ejerudgift og faste udgifter", value: inputs.monthlyOpex, formula: "Ejendomsskat, grundskyld, forsikring og fællesudgifter, fra annoncen. Administration er lagt til, hvis du har valgt en administrator.", input: { value: inputs.monthlyOpex, set: (n) => set({ monthlyOpex: n }), suffix: "kr./md." } },
    { kind: "row", key: "noi", label: "Driftsresultat", value: krMd(r.noi / 12), formula: "= leje − tomgang − vedligehold − ejerudgift og faste udgifter, før lån" },

    { kind: "head", label: "Lån" },
    ...(cash
      ? []
      : [
          { kind: "row" as const, key: "rate", label: "Rente", value: inputs.interestRate, formula: "Samlet rente og bidrag på hele lånet om året", input: { value: inputs.interestRate, set: (n: number) => set({ interestRate: n }), suffix: "%", decimals: 2 } },
          { kind: "row" as const, key: "interest", label: "Renter", value: krMd(interest1), formula: `= lån ${kr(r.loan)} × ${pct(inputs.interestRate, 2)} / 12, første måned` },
          { kind: "row" as const, key: "principal", label: "Afdrag", value: krMd(principal1), formula: `= ydelse − renter. Afdrag er ikke en udgift, det er opsparing i boligen over ${inputs.termYears} år.` },
        ]),

    { kind: "head", label: "Hver måned" },
    ...(cash
      ? []
      : [{ kind: "row" as const, key: "before", label: "Overskud før afdrag", value: krMd(beforePrincipal), formula: "= driftsresultat − renter. Det, boligen tjener, før du sparer op i den.", tone: beforePrincipal >= 0 ? ("good" as const) : ("bad" as const) }]),
    {
      kind: "row",
      key: "cf",
      label: cash ? "Overskud" : "Overskud efter afdrag",
      value: signed(r.cashFlow, " kr./md."),
      formula: cash ? "= driftsresultat. Kontant køb, intet lån." : "= driftsresultat − hele ydelsen. Det, der lander på din konto.",
      strong: true,
      total: true,
      tone: r.cashFlow >= 0 ? "good" : "bad",
    },
    { kind: "row", key: "coc", label: "Kontantafkast", value: pct(r.cashOnCash), formula: "= overskud efter afdrag om året / din egen kapital" },
    { kind: "row", key: "cap", label: "Nettoafkast", value: pct(r.capRate), formula: "= driftsresultat om året / købspris. Boligens afkast uden lån." },
    ...(cash ? [] : [{ kind: "row" as const, key: "dscr", label: "Gældsdækning", value: r.dscr.toLocaleString("da-DK", { maximumFractionDigits: 2 }), formula: "= driftsresultat / ydelse. Over 1,25 siger banken typisk ja.", tone: r.dscr >= 1.25 ? ("good" as const) : r.dscr >= 1 ? ("warn" as const) : ("bad" as const) }]),

    { kind: "head", label: `Om ${years} år` },
    { kind: "row", key: "hold", label: parents ? "Indtil I sælger" : "Ejertid", value: years, formula: parents ? "Typisk studiets længde. Så sælger I, eller den lejes ud til andre." : "Hvor længe du ejer boligen, før du sælger.", input: { value: years, set: (n) => set({ holdYears: Math.max(1, Math.min(40, Math.round(n))) }), suffix: "år" } },
    { kind: "row", key: "appr", label: "Værdistigning om året", value: inputs.appreciationPct, formula: "Gennemsnitlig prisstigning om året. Danmarks Statistik viser det faktiske niveau for området under Fremtid.", input: { value: inputs.appreciationPct, set: (n) => set({ appreciationPct: n }), suffix: "%", decimals: 1 } },
    { kind: "row", key: "sale", label: "Salgsværdi", value: r.saleValue, formula: `= købspris × (1 + ${pct(inputs.appreciationPct)})^${years}` },
    { kind: "row", key: "debt", label: "Restgæld", value: -endBalance, formula: "Det, du skylder på lånet, når du sælger" },
    { kind: "row", key: "sellcost", label: "Salgsomkostninger", value: -sellCosts, formula: "Mægler 1,5 %, mindst 35.000 kr., plus rapporter og øvrigt 35.000 kr." },
    { kind: "row", key: "cum", label: parents ? "Overskud fra husleje i alt" : "Overskud fra lejen i alt", value: rentTotal, formula: "Summen af årenes overskud efter afdrag, med lejevækst og stigende udgifter" },
    ...(parents ? [{ kind: "row" as const, key: "family", label: "Husleje, der bliver i familien", value: familyRent, formula: `= ${kr(inputs.monthlyRent)} × 12 × ${years} år. Ved en almindelig lejebolig var de penge gået til en udlejer.`, tone: "good" as const }] : []),
    { kind: "row", key: "gain", label: "Gevinst før skat", value: r.totalProfit, formula: "= overskud fra lejen + (salgsværdi − salgsomkostninger − restgæld) − din egen kapital" },
    { kind: "row", key: "tax", label: "Skat af avance ved salg", value: tax ? -tax : 0, formula: parents ? "I bor der ikke selv, så parcelhusreglen gælder ikke: 42 % af avancen efter 10.000 kr. pr. år. Vejledende." : "42 % af avancen efter 10.000 kr. pr. år, du har ejet boligen. Vejledende." },
    { kind: "row", key: "net", label: parents ? "Familiens gevinst efter skat af avance" : "Gevinst efter skat af avance", value: afterTax, formula: "= gevinst før skat − skat af avance. Skat af det løbende lejeoverskud afhænger af din indkomst og er ikke trukket fra.", strong: true, tone: afterTax >= 0 ? "good" : "bad" },
    ...(parents
      ? [{
          kind: "row" as const,
          key: "vsrent",
          label: "I forhold til at barnet lejer",
          value: signed(pv.vsRenting),
          formula: `Lejer barnet i stedet, går ${kr(pv.familyRent)} i husleje til en udlejer over ${years} år. = familiens gevinst efter skat + ${kr(pv.familyRent)}. Det, de ${kr(r.cashInvested)} kunne have tjent andre steder, er ikke regnet med.`,
          strong: true,
          tone: pv.vsRenting >= 0 ? ("good" as const) : ("bad" as const),
        }]
      : []),
    { kind: "row", key: "irr", label: "Afkast om året", value: pct(r.irr), formula: "Den årlige forrentning af din egen kapital over hele ejertiden (IRR), før skat" },
  ];

  // Scenarios. A forældrekøb has a fixed tenant, so only rate, upkeep and
  // prices move; a rental also risks lower rent and empty months.
  const base: AnalysisInput = { ...inputs };
  const low = analyze({
    ...base,
    monthlyRent: parents ? inputs.monthlyRent : inputs.monthlyRent * 0.9,
    interestRate: inputs.interestRate + 1.5,
    vacancyPct: parents ? 0 : Math.max(inputs.vacancyPct, 8.3),
    maintenancePct: inputs.maintenancePct + 4,
    appreciationPct: Math.max(0, inputs.appreciationPct - 2),
  });
  const high = analyze({
    ...base,
    monthlyRent: parents ? inputs.monthlyRent : inputs.monthlyRent * 1.05,
    interestRate: Math.max(1, inputs.interestRate - 0.5),
    appreciationPct: inputs.appreciationPct + 1,
  });
  const runs = [low, r, high];
  const columns: ScenarioColumn[] = [
    {
      key: "low",
      title: "Forsigtig",
      good: low.cashFlow >= 0,
      assumptions: [
        ...(parents ? [] : [rentEstimated ? "Leje 10 % under vores skøn" : "Leje 10 % lavere ved næste lejer", "En måneds tomgang om året"]),
        "Rente +1,5 procentpoint",
        "Vedligehold +4 procentpoint",
        `Værdistigning ${pct(Math.max(0, inputs.appreciationPct - 2))} om året`,
      ],
    },
    { key: "base", title: "Forventet", good: r.cashFlow >= 0, assumptions: ["Tallene i regnearket"] },
    {
      key: "high",
      title: "Optimistisk",
      good: high.cashFlow >= 0,
      assumptions: [...(parents ? [] : ["Leje 5 % højere"]), "Rente −0,5 procentpoint", `Værdistigning ${pct(inputs.appreciationPct + 1)} om året`],
    },
  ];
  const tone = (n: number) => (n >= 0 ? ("good" as const) : ("bad" as const));

  return (
    <>
      <Sheet title={parents ? "Forældrekøb-kalkule" : "Udlejnings-kalkule"} rows={rows} initial="cf" onExport={onExport} exporting={exporting} />
      <Scenarios
        columns={columns}
        summary={scenarioSummary(columns, "Boligen giver overskud hver måned", "Boligen giver underskud hver måned")}
        lines={[
          { label: "Overskud pr. md. efter afdrag", values: runs.map((x) => signed(x.cashFlow, " kr.")), strong: true, tones: runs.map((x) => tone(x.cashFlow)) },
          { label: "Kontantafkast", values: runs.map((x) => pct(x.cashOnCash)) },
          { label: `Gevinst om ${years} år før skat`, values: runs.map((x) => kr(x.totalProfit)), tones: runs.map((x) => tone(x.totalProfit)) },
          { label: "Afkast om året", values: runs.map((x) => pct(x.irr)) },
        ]}
      />
    </>
  );
}

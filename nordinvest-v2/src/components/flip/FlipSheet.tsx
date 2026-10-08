"use client";

import { Sheet, type SheetRow } from "@/components/sheet/Sheet";
import type { FlipAnswers, FlipResult, Property, TaxCase } from "@/lib/flip/model";

/*
 * The whole flip as one sheet, the way a flipper, a bank or a partner already
 * reads a deal: købspris down to fortjeneste, blue cells are yours to change,
 * every other cell is a formula the bar above shows in words. Everything
 * further down the page is the evidence behind a row.
 */

const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const pct = (n: number, d = 1) => `${(n * 100).toLocaleString("da-DK", { minimumFractionDigits: d, maximumFractionDigits: d })} %`;
const TAX: Record<TaxCase, string> = { live_in: "Bo og flip, skattefri", private: "Privat salg", business: "Næring" };

export function FlipSheet({
  property,
  result,
  answers,
  arv,
  arvSource,
  bufferPct,
  set,
  setPrice,
  setArv,
  onExport,
  exporting,
}: {
  property: Property;
  result: FlipResult;
  answers: FlipAnswers;
  arv: number;
  arvSource: string;
  bufferPct: number;
  set: (patch: Partial<FlipAnswers>) => void;
  setPrice: (n: number) => void;
  setArv: (n: number) => void;
  onExport: () => void;
  exporting: boolean;
}) {
  const cash = answers.finance === "cash";
  const live = answers.strategy === "live_flip";
  const running = (property.monthlyExpenses ?? Math.round(property.area * 30)) + 1200;
  const rows: SheetRow[] = [
    { kind: "head", label: "Køb" },
    { kind: "row", key: "price", label: "Købspris", value: property.price, formula: "Udbudsprisen. Skriv dit bud for at se, hvad det gør.", input: { value: property.price, set: setPrice, suffix: "kr." } },
    { kind: "row", key: "down", label: "Udbetaling", value: cash ? 100 : answers.downPct, formula: "Din egen andel af købsprisen. 100 % er kontant køb.", input: { value: cash ? 100 : answers.downPct, set: (n) => set(n >= 100 ? { finance: "cash" } : { finance: "loan", downPct: Math.max(5, n) }), suffix: "%" } },
    { kind: "row", key: "skoede", label: "Tinglysning af skøde", value: result.buy.tinglysning, formula: "= 1.850 kr. + 0,6 % × købspris" },
    { kind: "row", key: "pant", label: "Tinglysning af pantebrev", value: result.buy.pant, formula: cash ? "Intet lån, intet pantebrev" : "= 1.825 kr. + 1,25 % × lån (satsen fra 1.1.2026)" },
    { kind: "row", key: "lawyer", label: "Køberrådgiver", value: result.buy.lawyer, formula: "Skøn for advokat eller køberrådgiver" },
    { kind: "head", label: "Renovering" },
    { kind: "row", key: "mat", label: "Materialer", value: result.costs.materials, formula: "= summen af materialerne i planen, Silvan- og XL-BYG-priser inkl. moms", link: { href: "#renovering", text: "Se poster" } },
    { kind: "row", key: "lab", label: "Håndværkere", value: result.costs.labour, formula: "= timer × timepris for faget i din region × 1,25 moms. Det, du laver selv, tæller 0 kr.", link: { href: "#renovering", text: "Se poster" } },
    { kind: "row", key: "buf", label: `Buffer, ${bufferPct} %`, value: result.costs.buffer, formula: `= ${bufferPct} % × (materialer + håndværkere). Skjulte fejl findes altid.` },
    { kind: "head", label: live ? "Mens du bor der" : "Ejertid" },
    { kind: "row", key: "months", label: live ? "Måneder du bor der" : "Måneder fra køb til salg", value: answers.months, formula: live ? "Parcelhusreglen kræver, at du faktisk bor der. Hver måned koster renter og drift, men du sparer din nuværende boligudgift." : "Renovering plus tid til salg. Hver måned koster renter og drift.", input: { value: answers.months, set: (n) => set({ months: Math.max(1, Math.min(60, n)) }), suffix: "mdr." } },
    ...(cash ? [] : [{ kind: "row" as const, key: "rate", label: "Rente", value: answers.rate, formula: "Samlet rente på lånet om året", input: { value: answers.rate, set: (n: number) => set({ rate: n }), suffix: "%", decimals: 1 } }]),
    { kind: "row", key: "interest", label: "Renter", value: result.hold.interest, formula: cash ? "Kontant køb, ingen renter" : `= lån × ${answers.rate.toLocaleString("da-DK")} % × ${answers.months} / 12` },
    { kind: "row", key: "running", label: "Ejerudgift og forbrug", value: result.hold.running, formula: `= ${kr(running)} pr. md. × ${answers.months} mdr. (ejerudgift fra annoncen + 1.200 kr. forbrug)` },
    ...(live
      ? [
          { kind: "row" as const, key: "housing", label: "Din boligudgift i dag", value: answers.currentHousing ?? 0, formula: "Husleje, eller ydelse og faste udgifter på din nuværende bolig. Den betaler du ikke, mens du bor her.", input: { value: answers.currentHousing ?? 0, set: (n: number) => set({ currentHousing: Math.max(0, n) }), suffix: "kr./md." } },
          { kind: "row" as const, key: "saved", label: "Sparet boligudgift", value: result.hold.saved, formula: `= ${kr(answers.currentHousing ?? 0)} × ${answers.months} mdr.`, tone: "good" as const },
        ]
      : []),
    { kind: "head", label: "Salg" },
    { kind: "row", key: "arv", label: "Salgspris efter renovering", value: arv, formula: arvSource, input: { value: arv, set: setArv, suffix: "kr." }, link: { href: "#vaerdi", text: "Se boligerne" } },
    { kind: "row", key: "broker", label: "Mægler", value: result.sell.broker, formula: "= 1,5 % × salgspris, mindst 35.000 kr." },
    { kind: "row", key: "reports", label: "Rapporter og øvrigt", value: result.sell.reports + result.sell.other, formula: "Tilstands- og elrapport 15.000 kr. + markedsføring, ejerskifte og advokat 20.000 kr." },
    { kind: "head", label: "Resultat" },
    { kind: "row", key: "before", label: "Fortjeneste før skat", value: result.profitBeforeTax, formula: "= salgspris − købspris − købs-, renoverings-, ejertids- og salgsomkostninger", strong: true },
    { kind: "row", key: "tax", label: `Skat, ${TAX[result.taxCase].toLowerCase()}`, value: result.tax ? -result.tax : 0, formula: result.taxCase === "live_in" ? "Parcelhusreglen: skattefri, når du har boet der og grunden er under 1.400 m²" : result.taxCase === "private" ? "= 42 % × (avance − 10.000 kr. pr. år) − 33 % × renter" : "= ca. 52 % × fortjeneste før skat", link: { href: "#skat", text: "Se skat" } },
    { kind: "row", key: "profit", label: "Fortjeneste efter skat", value: result.profit, formula: "= fortjeneste før skat − skat", strong: true, total: true, tone: result.profit >= 0 ? "good" : "bad" },
    { kind: "row", key: "margin", label: "Af salgsprisen", value: pct(result.margin), formula: "= fortjeneste efter skat / salgspris", tone: result.margin >= answers.target / 100 ? "good" : "bad" },
    { kind: "row", key: "roi", label: "Afkast på egen kapital", value: pct(result.roi, 0), formula: `= fortjeneste efter skat / ${kr(result.equity)} egen kapital bundet i projektet` },
    { kind: "row", key: "target", label: "Krævet fortjeneste", value: answers.target, formula: "Dit krav, i procent af salgsprisen. Det styrer dit maksimale bud.", input: { value: answers.target, set: (n) => set({ target: Math.max(0, Math.min(50, n)) }), suffix: "%" } },
    { kind: "row", key: "maxbid", label: "Dit maksimale bud", value: result.maxBid, formula: `Den højeste købspris, der stadig giver ${answers.target} % efter skat med alt det andet uændret`, strong: true },
  ];
  return <Sheet title="Flip-kalkule" rows={rows} initial="profit" onExport={onExport} exporting={exporting} />;
}

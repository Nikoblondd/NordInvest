"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { NumberInput } from "@/components/ui/NumberInput";
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

type Row =
  | { kind: "head"; label: string }
  | {
      kind: "row";
      key: string;
      label: string;
      value: number | string;
      formula: string;
      input?: { value: number; set: (n: number) => void; suffix?: string; decimals?: number };
      strong?: boolean;
      tone?: "good" | "bad";
      link?: { href: string; text: string };
    };

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
  const running = (property.monthlyExpenses ?? Math.round(property.area * 30)) + 1200;
  const rows: Row[] = [
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
    { kind: "head", label: "Ejertid" },
    { kind: "row", key: "months", label: "Måneder fra køb til salg", value: answers.months, formula: "Renovering plus tid til salg. Hver måned koster renter og drift.", input: { value: answers.months, set: (n) => set({ months: Math.max(1, Math.min(60, n)) }), suffix: "mdr." } },
    ...(cash ? [] : [{ kind: "row" as const, key: "rate", label: "Rente", value: answers.rate, formula: "Samlet rente på lånet om året", input: { value: answers.rate, set: (n: number) => set({ rate: n }), suffix: "%", decimals: 1 } }]),
    { kind: "row", key: "interest", label: "Renter", value: result.hold.interest, formula: cash ? "Kontant køb, ingen renter" : `= lån × ${answers.rate.toLocaleString("da-DK")} % × ${answers.months} / 12` },
    { kind: "row", key: "running", label: "Ejerudgift og forbrug", value: result.hold.running, formula: `= ${kr(running)} pr. md. × ${answers.months} mdr. (ejerudgift fra annoncen + 1.200 kr. forbrug)` },
    { kind: "head", label: "Salg" },
    { kind: "row", key: "arv", label: "Salgspris efter renovering", value: arv, formula: arvSource, input: { value: arv, set: setArv, suffix: "kr." }, link: { href: "#vaerdi", text: "Se boligerne" } },
    { kind: "row", key: "broker", label: "Mægler", value: result.sell.broker, formula: "= 1,5 % × salgspris, mindst 35.000 kr." },
    { kind: "row", key: "reports", label: "Rapporter og øvrigt", value: result.sell.reports + result.sell.other, formula: "Tilstands- og elrapport 15.000 kr. + markedsføring, ejerskifte og advokat 20.000 kr." },
    { kind: "head", label: "Resultat" },
    { kind: "row", key: "before", label: "Fortjeneste før skat", value: result.profitBeforeTax, formula: "= salgspris − købspris − købs-, renoverings-, ejertids- og salgsomkostninger", strong: true },
    { kind: "row", key: "tax", label: `Skat, ${TAX[result.taxCase].toLowerCase()}`, value: result.tax ? -result.tax : 0, formula: result.taxCase === "live_in" ? "Parcelhusreglen: skattefri, når du har boet der og grunden er under 1.400 m²" : result.taxCase === "private" ? "= 42 % × (avance − 10.000 kr. pr. år) − 33 % × renter" : "= ca. 52 % × fortjeneste før skat", link: { href: "#skat", text: "Se skat" } },
    { kind: "row", key: "profit", label: "Fortjeneste efter skat", value: result.profit, formula: "= fortjeneste før skat − skat", strong: true, tone: result.profit >= 0 ? "good" : "bad" },
    { kind: "row", key: "margin", label: "Af salgsprisen", value: pct(result.margin), formula: "= fortjeneste efter skat / salgspris", tone: result.margin >= answers.target / 100 ? "good" : "bad" },
    { kind: "row", key: "roi", label: "Afkast på egen kapital", value: pct(result.roi, 0), formula: `= fortjeneste efter skat / ${kr(result.equity)} egen kapital bundet i projektet` },
    { kind: "row", key: "target", label: "Krævet fortjeneste", value: answers.target, formula: "Dit krav, i procent af salgsprisen. Det styrer dit maksimale bud.", input: { value: answers.target, set: (n) => set({ target: Math.max(0, Math.min(50, n)) }), suffix: "%" } },
    { kind: "row", key: "maxbid", label: "Dit maksimale bud", value: result.maxBid, formula: `Den højeste købspris, der stadig giver ${answers.target} % efter skat med alt det andet uændret`, strong: true },
  ];
  const [sel, setSel] = useState("profit");
  const current = rows.find((r) => r.kind === "row" && r.key === sel) as Extract<Row, { kind: "row" }> | undefined;
  let n = 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      {/* Toolbar + formula bar, like the top of a spreadsheet. */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600 text-[11px] font-bold text-white">X</span>
          <span className="text-[15px] font-semibold text-slate-900">Flip-kalkule</span>
          <span className="hidden text-[13px] text-slate-500 sm:inline">· blå felter kan rettes</span>
        </div>
        <button type="button" onClick={onExport} disabled={exporting} className="no-print inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3.5 text-[13px] font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Hent som Excel
        </button>
      </div>
      <div className="flex min-h-[44px] items-start gap-3 border-b border-slate-200 px-4 py-2.5 font-mono text-[12.5px] leading-snug">
        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-semibold italic text-slate-500">fx</span>
        <span className="min-w-0 text-slate-700">
          <span className="font-semibold text-slate-900">{current?.label}</span> {current?.formula}
        </span>
      </div>

      <table className="w-full table-fixed border-collapse text-[14.5px]">
        <colgroup>
          <col className="w-8 sm:w-9" />
          <col />
          <col className="w-[138px] sm:w-[220px]" />
          <col className="w-0 sm:w-[120px]" />
        </colgroup>
        <tbody>
          {rows.map((r) => {
            if (r.kind === "head") {
              return (
                <tr key={r.label} className="bg-slate-50">
                  <td className="border-y border-slate-200 py-1.5 text-center text-[11px] text-slate-300" />
                  <td colSpan={3} className="border-y border-slate-200 py-1.5 pl-3 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">{r.label}</td>
                </tr>
              );
            }
            n += 1;
            const active = sel === r.key;
            const num = typeof r.value === "number" ? kr(r.value) : r.value;
            return (
              <tr
                key={r.key}
                onClick={() => setSel(r.key)}
                className={clsx("cursor-default border-b border-slate-100", active ? "bg-blue-50/60" : "hover:bg-slate-50/70", r.key === "profit" && "border-t-2 border-t-slate-300")}
              >
                <td className={clsx("py-2 text-center text-[11px] tabular-nums", active ? "font-semibold text-blue-700" : "text-slate-400")}>{n}</td>
                <td className={clsx("py-2 pl-2 pr-2 leading-snug sm:pl-3", r.strong ? "font-semibold text-slate-900" : "text-slate-700")}>{r.label}</td>
                <td className="py-1 pr-2 text-right sm:pr-3">
                  {r.input ? (
                    <label className={clsx("ml-auto flex h-9 max-w-[200px] items-center justify-end gap-1 rounded-md px-2 ring-1 ring-inset", active ? "bg-white ring-blue-400" : "bg-blue-50/70 ring-blue-100")}>
                      <NumberInput
                        value={r.input.value}
                        decimals={r.input.decimals}
                        onFocus={() => setSel(r.key)}
                        onValueChange={(v) => v != null && r.input!.set(v)}
                        aria-label={r.label}
                        className="w-full min-w-0 bg-transparent text-right font-semibold tabular-nums text-blue-700 outline-none"
                      />
                      {r.input.suffix && <span className="shrink-0 text-[12.5px] text-blue-700/70">{r.input.suffix}</span>}
                    </label>
                  ) : (
                    <span
                      className={clsx(
                        "tabular-nums",
                        r.strong && "font-semibold",
                        r.tone === "good" ? "text-emerald-700" : r.tone === "bad" ? "text-rose-600" : "text-slate-900",
                        r.key === "profit" && "text-[17px] underline decoration-double decoration-1 underline-offset-4",
                      )}
                    >
                      {num}
                    </span>
                  )}
                </td>
                <td className="hidden py-2 pr-4 text-right text-[12.5px] sm:table-cell">
                  {r.link && (
                    <a href={r.link.href} onClick={(e) => e.stopPropagation()} className="no-print text-blue-700 hover:underline">
                      {r.link.text}
                    </a>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

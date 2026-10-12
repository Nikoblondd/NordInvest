"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { AnalysisScreen, DealScreen, DocsScreen, Notice, OfferScreen } from "./screens";

/*
 * One property, all the way: the visitor clicks through the four stages and
 * sees the same home (Algade 9) move from found to accepted offer, with the
 * numbers following it. Mirrors the product's own flow.
 */

const STEPS = [
  {
    k: "Find",
    title: "Den dukker op, før du har ledt.",
    text: "Deal-motoren regner hver dag på boligerne til salg og giver dig besked, når én passer til din strategi.",
    points: ["Hele markedet regnet igennem hver morgen", "Dit område, din pris og dit krav til overskud", "Gem med ét tryk, så følger tallene med"],
    Screen: DealScreen,
    notice: { tone: "blue" as const, label: "Deal-vagt, kl. 07.12", title: "Algade 9, Holstebro", text: "Ny bolig, der matcher dig. +2.120 kr./md. med dit lån.", action: "Se boligen" },
  },
  {
    k: "Regn",
    title: "Et minut senere ved du, om den holder.",
    text: "BBR, solgte priser og sammenlignelige lejemål hentes automatisk. Du ser overskuddet, og hvad der sker, hvis renten stiger.",
    points: ["Overskud pr. måned efter lån og alle udgifter", "Hvor højt renten kan gå, før lejen ikke rækker", "Kilden står ved hvert tal"],
    Screen: AnalysisScreen,
    notice: { tone: "green" as const, label: "Analysen er klar", title: "Holder til 7,1 % rente", text: "Lejen dækker lånet 2,1 gange." },
  },
  {
    k: "Gennemgå",
    title: "Papirerne er læst, før du står i opgangen.",
    text: "Upload salgsopstilling, referater og vedligeholdelsesplan. Du får risici med citat og sidetal, og spørgsmålene til mægleren.",
    points: ["Ekstraordinære indbetalinger og vedtagne arbejder", "Må du overhovedet leje ud?", "Spørgsmål klar til fremvisningen"],
    Screen: DocsScreen,
    notice: { tone: "amber" as const, label: "Referat 2025, side 11", title: "Pas på: 38.000 kr. i 2026", text: "Ekstraordinær indbetaling til nyt tag.", dark: true },
  },
  {
    k: "Byd",
    title: "Du byder med en grænse, ikke en mavefornemmelse.",
    text: "NordInvest regner dit højeste bud ud fra det overskud, du vil have. Bud, modbud og forbehold samles på boligen.",
    points: ["Dit maks, regnet fra dit krav til overskud", "Hele budforløbet med datoer", "Forbehold, så du kan træde tilbage"],
    Screen: OfferScreen,
    notice: { tone: "green" as const, label: "I dag, 11.40", title: "Bud accepteret", text: "1.090.000 kr. Under dit maks på 1.120.000 kr." },
  },
];

export function Walkthrough() {
  const [i, setI] = useState(0);
  const s = STEPS[i];
  const { Screen } = s;
  return (
    <div>
      <div role="tablist" className="mx-auto flex max-w-full items-center justify-center gap-1 overflow-x-auto pb-1 [scrollbar-width:none] sm:gap-2">
        {STEPS.map((st, n) => (
          <div key={st.k} className="flex shrink-0 items-center gap-1 sm:gap-2">
            <button type="button" role="tab" aria-selected={i === n} onClick={() => setI(n)}
              className={`flex min-h-[44px] items-center gap-2 rounded-full px-3 text-[15px] font-semibold transition-colors sm:px-4 ${i === n ? "bg-[#0b1b33] text-white shadow-md" : "text-slate-600 hover:bg-white hover:text-slate-900"}`}>
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] tabular-nums ${i === n ? "bg-blue-500 text-white" : n < i ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{n < i ? <Check size={13} /> : n + 1}</span>
              {st.k}
            </button>
            {n < STEPS.length - 1 && <span className="hidden h-px w-6 bg-slate-300 sm:block lg:w-10" />}
          </div>
        ))}
      </div>

      <div className="mt-10 grid items-center gap-10 lg:mt-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div key={s.k} className="animate-[fadeUp_.4s_ease-out]">
          <p className="text-[14px] font-semibold text-blue-600">Trin {i + 1} af 4 · {s.k}</p>
          <h3 className="mt-2 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-[#0b1b33] [text-wrap:balance] sm:text-[36px]">{s.title}</h3>
          <p className="mt-4 text-[17px] leading-relaxed text-slate-600">{s.text}</p>
          <ul className="mt-6 space-y-3 border-t border-slate-200 pt-6">
            {s.points.map((p) => <li key={p} className="flex gap-3 text-[16px] text-slate-800"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600"><Check size={13} strokeWidth={2.5} /></span>{p}</li>)}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            {i < STEPS.length - 1 ? (
              <button type="button" onClick={() => setI(i + 1)} className="inline-flex min-h-[46px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-[15px] font-semibold text-slate-900 hover:border-slate-400">Næste: {STEPS[i + 1].k} <ArrowRight size={16} /></button>
            ) : (
              <button type="button" onClick={() => setI(0)} className="inline-flex min-h-[46px] items-center rounded-lg border border-slate-300 bg-white px-4 text-[15px] font-semibold text-slate-900 hover:border-slate-400">Se forløbet igen</button>
            )}
            <Link href="/adgang" className="inline-flex min-h-[46px] items-center rounded-lg bg-blue-600 px-4 text-[15px] font-semibold text-white hover:bg-blue-500">Anmod om adgang</Link>
          </div>
        </div>
        <div key={`${s.k}-s`} className="relative animate-[fadeUp_.5s_ease-out] pb-10 sm:pb-0">
          <Screen />
          <Notice {...s.notice} className="absolute -bottom-2 right-2 sm:-bottom-12 sm:-right-4 lg:-right-10" />
        </div>
      </div>
    </div>
  );
}

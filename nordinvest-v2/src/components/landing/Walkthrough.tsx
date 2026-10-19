"use client";

import { useEffect, useRef, useState } from "react";
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

const N = STEPS.length;

/*
 * Desktop: the section pins while the visitor scrolls, and each screen of
 * scroll moves the home one stage further (Find, Regn, Gennemgå, Byd). Screens
 * hand over with a depth transition and the stepper fills. Phones: a swipe
 * carousel with one card per stage. Both use IntersectionObserver, no scroll
 * listeners.
 */
export function Walkthrough() {
  return (
    <>
      <PinnedSteps />
      <SwipeSteps />
    </>
  );
}

function Stepper({ active, onPick, compact }: { active: number; onPick: (i: number) => void; compact?: boolean }) {
  return (
    <div role="tablist" aria-label="Trin" className="relative mx-auto flex max-w-2xl items-center justify-between">
      <span aria-hidden className="absolute left-6 right-6 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-slate-200" />
      <span aria-hidden className="absolute left-6 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-blue-600 transition-[width] duration-700 ease-out" style={{ width: `calc((100% - 3rem) * ${active / (N - 1)})` }} />
      {STEPS.map((st, n) => (
        <button key={st.k} type="button" role="tab" aria-selected={active === n} onClick={() => onPick(n)}
          className={`relative z-10 flex min-h-[44px] items-center gap-2 rounded-full font-semibold ${compact ? (active === n ? "px-3 text-[14px]" : "min-w-[44px] justify-center px-2.5 text-[14px]") : "px-3.5 text-[15px]"} transition-all duration-500 ${active === n ? "bg-[#0b1b33] text-white shadow-lg shadow-blue-900/20" : n < active ? "bg-white text-slate-900 ring-1 ring-slate-200" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:text-slate-900"}`}>
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] tabular-nums transition-colors duration-500 ${active === n ? "bg-blue-500 text-white" : n < active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{n < active ? <Check size={13} /> : n + 1}</span>
          {(!compact || active === n) ? st.k : <span className="sr-only">{st.k}</span>}
        </button>
      ))}
    </div>
  );
}

function PinnedSteps() {
  const [active, setActive] = useState(0);
  const markers = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
    }, { rootMargin: "-50% 0px -50% 0px" });
    markers.current.forEach((m) => m && io.observe(m));
    return () => io.disconnect();
  }, []);
  const go = (i: number) => markers.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <div className="relative hidden lg:block" style={{ height: `${N * 85 + 20}vh` }}>
      {STEPS.map((_, i) => (
        <div key={i} ref={(el) => { markers.current[i] = el; }} data-i={i} aria-hidden className="pointer-events-none absolute inset-x-0" style={{ top: `${i * 85}vh`, height: "85vh" }} />
      ))}
      <div className="sticky top-16 flex h-[calc(100dvh-64px)] flex-col justify-center py-6">
        <Stepper active={active} onPick={go} />
        <div className="mt-10 grid items-center gap-14 xl:mt-14 xl:gap-20" style={{ gridTemplateColumns: "0.8fr 1.2fr" }}>
          {/* Copy: every stage stacked in one cell, the active one shown */}
          <div className="grid">
            {STEPS.map((s, i) => (
              <div key={s.k} aria-hidden={i !== active} className={`[grid-area:1/1] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${i === active ? "opacity-100" : i < active ? "pointer-events-none -translate-y-6 opacity-0" : "pointer-events-none translate-y-6 opacity-0"}`}>
                <p className="text-[14px] font-semibold text-blue-600">Trin {i + 1} af 4 · {s.k}</p>
                <h3 className="mt-2 text-[34px] font-semibold leading-[1.08] tracking-[-0.03em] text-[#0b1b33] [text-wrap:balance] xl:text-[40px]">{s.title}</h3>
                <p className="mt-4 text-[17px] leading-relaxed text-slate-600">{s.text}</p>
                <ul className="mt-6 space-y-3 border-t border-slate-200 pt-6">
                  {s.points.map((p) => <li key={p} className="flex gap-3 text-[16px] text-slate-800"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600"><Check size={13} strokeWidth={2.5} /></span>{p}</li>)}
                </ul>
                <div className="mt-8 flex flex-wrap gap-3">
                  {i < N - 1
                    ? <button type="button" tabIndex={i === active ? 0 : -1} onClick={() => go(i + 1)} className="inline-flex min-h-[46px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-[15px] font-semibold text-slate-900 hover:border-slate-400">Næste: {STEPS[i + 1].k} <ArrowRight size={16} /></button>
                    : null}
                  <Link href="/adgang" tabIndex={i === active ? 0 : -1} className="inline-flex min-h-[46px] items-center rounded-lg bg-blue-600 px-4 text-[15px] font-semibold text-white hover:bg-blue-500">Anmod om adgang</Link>
                </div>
              </div>
            ))}
          </div>
          {/* Screens: the next one rises from below with a slight tilt, the last one sinks back */}
          <div className="relative grid [perspective:1800px]">
            {STEPS.map((s, i) => {
              const { Screen } = s;
              const state = i === active ? "on" : i < active ? "past" : "next";
              return (
                <div key={s.k} aria-hidden={i !== active} className={`relative [grid-area:1/1] [transform-style:preserve-3d] transition-[transform,opacity,filter] duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${state === "on" ? "z-20 opacity-100" : state === "past" ? "z-10 opacity-0 [transform:translateY(-48px)_scale(0.92)] blur-[2px]" : "z-0 opacity-0 [transform:translateY(90px)_rotateX(14deg)_scale(0.96)]"}`}>
                  <Screen />
                  <div className={`absolute -bottom-10 -right-4 transition-all delay-300 duration-700 ease-[cubic-bezier(0.34,1.4,0.64,1)] 2xl:-right-10 ${state === "on" ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-95 opacity-0"}`}>
                    <Notice {...s.notice} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SwipeSteps() {
  const [active, setActive] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
    }, { root: track.current, threshold: 0.6 });
    cards.current.forEach((c) => c && io.observe(c));
    return () => io.disconnect();
  }, []);
  const go = (i: number) => {
    const el = cards.current[i];
    if (el && track.current) track.current.scrollTo({ left: el.offsetLeft - 16, behavior: "smooth" });
  };

  return (
    <div className="lg:hidden">
      <Stepper compact active={active} onPick={go} />
      <div ref={track} className="-mx-4 mt-6 flex items-start snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-4 [scrollbar-width:none] sm:-mx-8 sm:scroll-px-8 sm:px-8" aria-roledescription="karrusel">
        {STEPS.map((s, i) => {
          const { Screen } = s;
          return (
            <div key={s.k} ref={(el) => { cards.current[i] = el; }} data-i={i} aria-label={`Trin ${i + 1} af 4`}
              className={`w-[86%] shrink-0 snap-start rounded-2xl bg-white p-4 ring-1 ring-slate-200 transition-[transform,opacity] duration-500 sm:w-[70%] ${active === i ? "opacity-100" : "scale-[0.97] opacity-60"}`}>
              <p className="text-[13px] font-semibold text-blue-600">Trin {i + 1} af 4 · {s.k}</p>
              <h3 className="mt-1.5 text-[22px] font-semibold leading-[1.15] tracking-[-0.025em] text-[#0b1b33]">{s.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{s.text}</p>
              <div className="mt-4"><Screen /></div>
              <Notice {...s.notice} className="mt-3 !w-full" />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-center">
        <div className="flex gap-1.5" aria-hidden>{STEPS.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all duration-500 ${active === i ? "w-6 bg-blue-600" : "w-1.5 bg-slate-300"}`} />)}</div>
      </div>
      <Link href="/adgang" className="mt-6 flex min-h-[50px] items-center justify-center rounded-lg bg-blue-600 text-[16px] font-semibold text-white">Anmod om adgang</Link>
    </div>
  );
}

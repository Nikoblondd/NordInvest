"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";

/*
 * "Fem spørgsmål" — the product demonstration. The analyzer is organised as
 * the questions an investor asks; each tab shows the one-line answer chip and
 * a drawn version of the evidence (rent reserve, comparables, expense check,
 * rate stress, plan data). Same illustrative house as the opening scene.
 */

type Tone = "good" | "warn";

type Question = {
  id: string;
  q: string;
  chapter: string;
  tone: Tone;
  answer: string;
  body: string;
  source: string;
  image: string;
  alt: string;
};

const QUESTIONS: Question[] = [
  {
    id: "penge",
    q: "Tjener den penge?",
    chapter: "Økonomi",
    tone: "good",
    answer: "Ja. Lejen kan falde 1.100 kr. om måneden, før du taber penge.",
    body: "Det kalder vi lejereserven. Jo større den er, jo bedre klarer du en lavere leje eller en måned uden lejer.",
    source: "Husleje minus lån og faste udgifter",
    image: "/landing/demo-rent-reserve.webp",
    alt: "Lejereserve: lejen er 13.000 kr., break-even er 11.900 kr., så der er 1.100 kr. i luft.",
  },
  {
    id: "pris",
    q: "Er prisen fair?",
    chapter: "Pris",
    tone: "good",
    answer: "Ja. Prisen pr. m² ligger 6 % under lignende boliger.",
    body: "Vi sammenligner med boliger til salg af samme type og størrelse i samme postnummer.",
    source: "Boliger til salg i samme postnummer",
    image: "/landing/demo-price-per-m2.webp",
    alt: "Pris pr. m²: denne bolig koster 15.114 kr. pr. m², medianen for lignende boliger er 16.050 kr.",
  },
  {
    id: "udgifter",
    q: "Holder udgifterne?",
    chapter: "Udgifter",
    tone: "warn",
    answer: "Nok ikke. Salgsopstillingen ligger 600 kr. under det normale.",
    body: "Hvis mægleren har sat de faste udgifter lavt, regner vi med vores eget tal i stedet.",
    source: "Salgsopstillingen mod lignende boliger",
    image: "/landing/demo-expenses.webp",
    alt: "Faste udgifter pr. måned: salgsopstilling 2.450 kr., lignende boliger 3.050 kr., vi regner med 3.250 kr.",
  },
  {
    id: "rente",
    q: "Hvad hvis renten stiger?",
    chapter: "Rente",
    tone: "good",
    answer: "Handlen holder, indtil renten når cirka 5,2 %.",
    body: "Vi regner handlen igennem ved forskellige renter, så du kan se, hvor den begynder at give underskud.",
    source: "Annuitetslån, 30 år, inkl. bidrag",
    image: "/landing/demo-rate-stress.webp",
    alt: "Overskud ved renter fra 3 til 7 %. I dag 4 %, underskud fra cirka 5,2 %.",
  },
  {
    id: "jorden",
    q: "Hvad ligger der i jorden?",
    chapter: "Planer",
    tone: "warn",
    answer: "Området skal separatkloakeres. Det kan koste dig penge.",
    body: "Vi tjekker lokalplaner og kommunens spildevandsplan. Den slags står sjældent i salgsopstillingen.",
    source: "Plandata.dk og kommunens spildevandsplan",
    image: "/landing/demo-plan-data.webp",
    alt: "Kortudsnit: grunden ligger i et kloakopland, hvor separering er planlagt, og inden for en lokalplan.",
  },
];

const ROTATE_MS = 7000;

export function QuestionsDemo() {
  const [active, setActive] = useState(0);
  const [touched, setTouched] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const reduce = useReducedMotion();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (touched || reduce || !inView) return;
    const t = window.setTimeout(() => setActive((a) => (a + 1) % QUESTIONS.length), ROTATE_MS);
    return () => window.clearTimeout(t);
  }, [active, touched, reduce, inView]);

  const select = (i: number) => {
    setTouched(true);
    setActive(i);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const dir = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (active + dir + QUESTIONS.length) % QUESTIONS.length;
    select(next);
    tabs.current[next]?.focus();
  };

  const q = QUESTIONS[active];

  return (
    <div ref={ref} className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
      <div
        role="tablist"
        aria-label="Spørgsmål i analysen"
        aria-orientation="vertical"
        onKeyDown={onKey}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0"
      >
        {QUESTIONS.map((item, i) => {
          const on = i === active;
          return (
            <button
              key={item.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`q-tab-${item.id}`}
              aria-selected={on}
              aria-controls="q-panel"
              tabIndex={on ? 0 : -1}
              onClick={() => select(i)}
              className={`group relative shrink-0 rounded-xl text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:rounded-2xl lg:px-5 lg:py-4 ${
                on
                  ? "bg-white px-4 py-2.5 ring-1 ring-slate-200 lg:shadow-card"
                  : "px-4 py-2.5 ring-1 ring-slate-200/70 hover:bg-white/60 lg:ring-0"
              }`}
            >
              {on && !touched && !reduce && (
                <motion.span
                  key={`bar-${active}`}
                  aria-hidden
                  className="absolute bottom-0 left-4 right-4 hidden h-[2px] origin-left rounded-full bg-blue-600/70 lg:block"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: inView ? 1 : 0 }}
                  transition={{ duration: ROTATE_MS / 1000, ease: "linear" }}
                />
              )}
              <span className="flex items-center gap-3">
                <span
                  aria-hidden
                  className={`h-2 w-2 shrink-0 rounded-full ${item.tone === "good" ? "bg-emerald-500" : "bg-amber-500"} ${on ? "" : "opacity-50"}`}
                />
                <span
                  className={`whitespace-nowrap font-thesis text-lg leading-tight tracking-[-0.01em] transition-colors lg:whitespace-normal lg:text-[1.65rem] ${
                    on ? "text-[#0b1b33]" : "text-slate-500 group-hover:text-slate-800"
                  }`}
                >
                  {item.q}
                </span>
              </span>
              <span className={`mt-2 hidden pl-5 text-sm leading-relaxed text-slate-600 ${on ? "lg:block" : ""}`}>{item.body}</span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id="q-panel" aria-labelledby={`q-tab-${q.id}`} className="min-w-0">
        <div className="product-window overflow-hidden rounded-2xl bg-white">
          <div className="flex items-center gap-2.5 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              {q.chapter}
            </span>
            <span className="truncate text-xs text-slate-500">Villa, 132 m², 1.995.000 kr.</span>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={q.id}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
              className="p-4 sm:p-6"
            >
              <p className="font-thesis text-2xl leading-tight tracking-[-0.01em] text-[#0b1b33] sm:text-[1.7rem]">{q.q}</p>
              <span
                className={`mt-3 inline-flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium ring-1 ring-inset ${
                  q.tone === "good" ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-amber-50 text-amber-900 ring-amber-200"
                }`}
              >
                <span aria-hidden className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${q.tone === "good" ? "bg-emerald-500" : "bg-amber-500"}`} />
                {q.answer}
              </span>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 lg:hidden">{q.body}</p>
              <div className="relative mt-5 aspect-[16/9] overflow-hidden rounded-xl bg-[#f4f6f9] ring-1 ring-inset ring-slate-200/70">
                <Image src={q.image} alt={q.alt} fill unoptimized className="object-cover" />
              </div>
              <p className="mt-3 text-xs text-slate-500">Kilde: {q.source}</p>
            </motion.div>
          </AnimatePresence>
        </div>
        <p className="mt-2.5 text-right text-xs text-slate-500">Samme eksempelbolig som ovenfor.</p>
      </div>
    </div>
  );
}

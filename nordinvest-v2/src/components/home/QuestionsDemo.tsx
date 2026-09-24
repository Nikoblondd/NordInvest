"use client";

import { useEffect, useRef, useState, type ComponentType, type KeyboardEvent, type ReactNode } from "react";
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
  Visual: ComponentType;
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
    Visual: RentReserve,
  },
  {
    id: "pris",
    q: "Er prisen fair?",
    chapter: "Pris",
    tone: "good",
    answer: "Ja. Prisen pr. m² ligger 6 % under lignende boliger.",
    body: "Vi sammenligner med boliger til salg af samme type og størrelse i samme postnummer.",
    source: "Boliger til salg i samme postnummer",
    Visual: Comparables,
  },
  {
    id: "udgifter",
    q: "Holder udgifterne?",
    chapter: "Udgifter",
    tone: "warn",
    answer: "Nok ikke. Salgsopstillingen ligger 600 kr. under det normale.",
    body: "Hvis mægleren har sat de faste udgifter lavt, regner vi med vores eget tal i stedet.",
    source: "Salgsopstillingen mod lignende boliger",
    Visual: ExpenseCheck,
  },
  {
    id: "rente",
    q: "Hvad hvis renten stiger?",
    chapter: "Rente",
    tone: "good",
    answer: "Handlen holder, indtil renten når cirka 5,2 %.",
    body: "Vi regner handlen igennem ved forskellige renter, så du kan se, hvor den begynder at give underskud.",
    source: "Annuitetslån, 30 år, inkl. bidrag",
    Visual: RateStress,
  },
  {
    id: "jorden",
    q: "Hvad ligger der i jorden?",
    chapter: "Planer",
    tone: "warn",
    answer: "Området skal separatkloakeres. Det kan koste dig penge.",
    body: "Vi tjekker lokalplaner og kommunens spildevandsplan. Den slags står sjældent i salgsopstillingen.",
    source: "Plandata.dk og kommunens spildevandsplan",
    Visual: PlanData,
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
              <div className="mt-5 rounded-xl bg-[#f6f8fb] p-3 ring-1 ring-inset ring-slate-200/70 sm:p-5">
                <q.Visual />
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

// ── Visuals ──────────────────────────────────────────────────────────────
// Each is a small, honest chart drawn for this page — the same shapes the
// analyzer uses, not screenshots.

const mono = { fontFamily: "var(--font-geist)" } as const;

function Svg({ label, children, h = 190 }: { label: string; children: ReactNode; h?: number }) {
  return (
    <svg viewBox={`0 0 520 ${h}`} className="block h-auto w-full" role="img" aria-label={label}>
      {children}
    </svg>
  );
}

function RentReserve() {
  // Scale 10.000 → 14.000 kr over x 30 → 490.
  const x = (v: number) => 30 + ((v - 10000) / 4000) * 460;
  const be = 11900;
  const rent = 13000;
  return (
    <Svg label="Lejereserve: nuværende leje 13.000 kr/md., break-even 11.900 kr/md., reserve 1.100 kr/md.">
      <text x="30" y="30" fontSize="11" fill="#64748b" style={mono}>Månedlig leje</text>
      <rect x="30" y="70" width="460" height="26" rx="6" fill="#e2e8f0" />
      <rect x="30" y="70" width={x(be) - 30} height="26" rx="6" fill="#fecdd3" opacity="0.55" />
      <rect x={x(be)} y="70" width={x(rent) - x(be)} height="26" fill="#10b981" />
      <text x={(x(be) + x(rent)) / 2} y="87" textAnchor="middle" fontSize="11" fontWeight="600" fill="#ffffff" style={mono}>1.100</text>
      <line x1={x(be)} x2={x(be)} y1="58" y2="108" stroke="#0b1b33" strokeDasharray="3 3" />
      <line x1={x(rent)} x2={x(rent)} y1="58" y2="108" stroke="#2563eb" strokeWidth="2" />
      <text x={x(be)} y="126" textAnchor="middle" fontSize="11" fill="#0b1b33" style={mono}>Break-even 11.900</text>
      <text x={x(rent)} y="50" textAnchor="middle" fontSize="11" fontWeight="600" fill="#2563eb" style={mono}>Leje 13.000</text>
      <text x="30" y="150" fontSize="10" fill="#94a3b8" style={mono}>10.000</text>
      <text x="490" y="150" textAnchor="end" fontSize="10" fill="#94a3b8" style={mono}>14.000 kr/md.</text>
      <text x="30" y="178" fontSize="12" fill="#047857" style={mono}>Lejereserve: 1.100 kr. (8,5 % af lejen)</text>
    </Svg>
  );
}

function Comparables() {
  // kr/m² for 14 illustrative comparable listings.
  const comps = [13200, 13900, 14300, 14800, 15500, 15800, 16000, 16100, 16600, 17200, 17600, 18300, 19100, 19800];
  const x = (v: number) => 30 + ((v - 12500) / 8000) * 460;
  const median = 16050;
  const me = 15114;
  const ys = [92, 76, 104, 84, 98, 72, 88, 106, 80, 94, 74, 100, 86, 96];
  return (
    <Svg label="Pris pr. m² for 14 sammenlignelige boliger. Denne bolig: 15.114 kr/m², medianen: 16.050 kr/m².">
      <text x="30" y="30" fontSize="11" fill="#64748b" style={mono}>Kr. pr. m², 14 lignende boliger</text>
      <line x1="30" x2="490" y1="130" y2="130" stroke="#cbd5e1" />
      {comps.map((c, i) => (
        <circle key={c} cx={x(c)} cy={ys[i]} r="6" fill="#94a3b8" fillOpacity="0.55" />
      ))}
      <line x1={x(median)} x2={x(median)} y1="54" y2="130" stroke="#0b1b33" strokeDasharray="3 3" />
      <text x={x(median) + 6} y="62" fontSize="10.5" fill="#0b1b33" style={mono}>Median 16.050</text>
      <circle cx={x(me)} cy="90" r="11" fill="#2563eb" fillOpacity="0.15" />
      <circle cx={x(me)} cy="90" r="7" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
      <text x={x(me)} y="150" textAnchor="middle" fontSize="11" fontWeight="600" fill="#2563eb" style={mono}>Denne bolig: 15.114</text>
      <text x="30" y="178" fontSize="10" fill="#94a3b8" style={mono}>12.500</text>
      <text x="490" y="178" textAnchor="end" fontSize="10" fill="#94a3b8" style={mono}>20.500 kr/m²</text>
    </Svg>
  );
}

function ExpenseCheck() {
  const rows = [
    { label: "Salgsopstilling", v: 2450, fill: "#f59e0b" },
    { label: "Lignende boliger", v: 3050, fill: "#94a3b8" },
    { label: "Vi regner med", v: 3250, fill: "#2563eb" },
  ];
  const w = (v: number) => (v / 3600) * 300;
  return (
    <Svg label="Faste udgifter pr. måned: salgsopstilling 2.450 kr, median for sammenlignelige 3.050 kr, NordInvest-estimat 3.250 kr.">
      <text x="20" y="30" fontSize="11" fill="#64748b" style={mono}>Faste udgifter pr. måned</text>
      {rows.map((r, i) => (
        <g key={r.label} transform={`translate(0 ${56 + i * 42})`}>
          <text x="20" y="15" fontSize="12" fill="#334155">{r.label}</text>
          <rect x="190" y="2" width="300" height="18" rx="5" fill="#e2e8f0" />
          <rect x="190" y="2" width={w(r.v)} height="18" rx="5" fill={r.fill} />
          <text x={196 + w(r.v)} y="15.5" fontSize="11" fontWeight="600" fill="#0b1b33" style={mono}>
            {r.v.toLocaleString("da-DK")}
          </text>
        </g>
      ))}
      <text x="20" y="182" fontSize="12" fill="#b45309" style={mono}>600 kr. under det normale niveau</text>
    </Svg>
  );
}

function RateStress() {
  const pts: [number, number][] = [
    [3, 2020],
    [4, 1100],
    [5, 180],
    [6, -820],
    [7, -1870],
  ];
  const x = (r: number) => 50 + ((r - 3) / 4) * 440;
  const y = (v: number) => 95 - (v / 2200) * 70;
  const d = pts.map(([r, v], i) => `${i ? "L" : "M"}${x(r)} ${y(v)}`).join("");
  const zero = 5.18;
  return (
    <Svg label="Cash flow pr. måned ved renter fra 3 til 7 procent. Positiv op til cirka 5,2 procent.">
      <text x="50" y="18" fontSize="11" fill="#64748b" style={mono}>Overskud pr. måned ved forskellige renter</text>
      <rect x="50" y={y(0)} width="440" height={y(-2200) - y(0)} fill="#fff1f2" />
      <line x1="50" x2="490" y1={y(0)} y2={y(0)} stroke="#94a3b8" />
      {[3, 4, 5, 6, 7].map((r) => (
        <text key={r} x={x(r)} y="182" textAnchor="middle" fontSize="10.5" fill="#94a3b8" style={mono}>
          {r} %
        </text>
      ))}
      <text x="44" y={y(2000) + 4} textAnchor="end" fontSize="10" fill="#94a3b8" style={mono}>+2k</text>
      <text x="44" y={y(0) + 4} textAnchor="end" fontSize="10" fill="#94a3b8" style={mono}>0</text>
      <text x="44" y={y(-1800) + 4} textAnchor="end" fontSize="10" fill="#94a3b8" style={mono}>−2k</text>
      <path d={d} fill="none" stroke="#0b1b33" strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx={x(4)} cy={y(1100)} r="5" fill="#2563eb" stroke="#fff" strokeWidth="2" />
      <text x={x(4) + 8} y={y(1100) - 8} fontSize="10.5" fontWeight="600" fill="#2563eb" style={mono}>I dag 4,0 %</text>
      <line x1={x(zero)} x2={x(zero)} y1="28" y2="168" stroke="#e11d48" strokeDasharray="3 3" />
      <text x={x(zero) + 6} y="40" fontSize="10.5" fontWeight="600" fill="#be123c" style={mono}>Underskud fra ca. 5,2 %</text>
    </Svg>
  );
}

function PlanData() {
  return (
    <Svg label="Kortudsnit: grunden ligger i et kloakopland med planlagt separatkloakering og inden for en gældende lokalplan." h={200}>
      <defs>
        <pattern id="q-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0V8" stroke="#f59e0b" strokeOpacity="0.45" strokeWidth="2" />
        </pattern>
      </defs>
      {/* roads */}
      <rect x="0" y="150" width="520" height="22" fill="#e2e8f0" />
      <rect x="360" y="0" width="22" height="200" fill="#e2e8f0" />
      {/* neighbouring plots */}
      {[20, 120, 220].map((px) => (
        <rect key={px} x={px} y="30" width="90" height="110" fill="#ffffff" stroke="#cbd5e1" />
      ))}
      <rect x="400" y="30" width="100" height="110" fill="#ffffff" stroke="#cbd5e1" />
      {/* sewer catchment */}
      <path d="M10 20H350V145H10Z" fill="url(#q-hatch)" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="6 4" />
      {/* the plot */}
      <rect x="120" y="30" width="90" height="110" fill="#dbeafe" stroke="#2563eb" strokeWidth="2" />
      <rect x="138" y="62" width="54" height="40" fill="#2563eb" />
      <text x="165" y="124" textAnchor="middle" fontSize="10" fontWeight="600" fill="#1d4ed8" style={mono}>NR. 14</text>
      {/* lokalplan boundary */}
      <path d="M4 12H510V190H4Z" fill="none" stroke="#64748b" strokeDasharray="2 5" />
      <rect x="392" y="150" width="120" height="40" rx="6" fill="#ffffff" stroke="#e2e8f0" />
      <text x="402" y="166" fontSize="9" fill="#64748b" style={mono}>Lokalplan</text>
      <text x="402" y="181" fontSize="10.5" fill="#0b1b33" style={mono}>Åben-lav bolig</text>
      <rect x="18" y="160" width="220" height="30" rx="6" fill="#fffbeb" stroke="#fcd34d" />
      <text x="28" y="179" fontSize="10.5" fill="#92400e" style={mono}>Kloakopland, separering planlagt</text>
    </Svg>
  );
}

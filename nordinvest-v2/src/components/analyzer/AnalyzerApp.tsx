"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { analyze, kr, krMd, pct, type Strategy } from "@/lib/analysis";
import { Button } from "@/components/ui/Button";
import { clsx } from "@/lib/clsx";

type Inputs = {
  price: number;
  monthlyRent: number;
  downPaymentPct: number;
  interestRate: number;
  monthlyExpenses: number;
  strategy: Strategy;
};

const DEFAULTS: Inputs = {
  price: 4_300_000,
  monthlyRent: 21_500,
  downPaymentPct: 20,
  interestRate: 5.0,
  monthlyExpenses: 3_800,
  strategy: "cashflow",
};

const strategies: { id: Strategy; label: string; hint: string }[] = [
  { id: "cashflow", label: "Cashflow", hint: "Månedligt overskud er målet" },
  { id: "appreciation", label: "Værdistigning", hint: "Vækst over tid" },
  { id: "value_add", label: "Value-add / renovering", hint: "BRRRR-strategi" },
];

function Field({
  label,
  value,
  onChange,
  suffix,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  suffix: string;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm text-stone-600">{label}</span>
      <div className="mt-1 flex items-center rounded-lg border border-stone-200 bg-white focus-within:border-navy-900">
        <input
          type="number"
          value={value}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-lg bg-transparent px-3 py-2.5 font-mono text-stone-900 tnum outline-none"
        />
        <span className="px-3 text-sm text-stone-400">{suffix}</span>
      </div>
    </label>
  );
}

export function AnalyzerApp() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [ran, setRan] = useState(false);
  const set = (patch: Partial<Inputs>) =>
    setInputs((p) => ({ ...p, ...patch }));

  const result = useMemo(() => analyze(inputs), [inputs]);

  const scoreColor =
    result.score >= 65
      ? "text-data-pos"
      : result.score >= 45
        ? "text-data-warn"
        : "text-data-neg";

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
      {/* INPUT PANEL */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl">Ejendommens tal</h2>
        <p className="mt-1 text-sm text-stone-500">
          Standardværdier afspejler danske gennemsnit. Ret dem til din handel.
        </p>

        <div className="mt-6 space-y-4">
          <Field
            label="Købspris"
            value={inputs.price}
            onChange={(n) => set({ price: n })}
            suffix="kr"
            step={25000}
          />
          <Field
            label="Månedlig leje"
            value={inputs.monthlyRent}
            onChange={(n) => set({ monthlyRent: n })}
            suffix="kr/md."
            step={500}
          />
          <Field
            label="Udbetaling"
            value={inputs.downPaymentPct}
            onChange={(n) => set({ downPaymentPct: n })}
            suffix="%"
          />
          <Field
            label="Rente"
            value={inputs.interestRate}
            onChange={(n) => set({ interestRate: n })}
            suffix="% p.a."
            step={0.25}
          />
          <Field
            label="Månedlige udgifter"
            value={inputs.monthlyExpenses}
            onChange={(n) => set({ monthlyExpenses: n })}
            suffix="kr/md."
            step={250}
          />
        </div>

        <div className="mt-6">
          <span className="text-sm text-stone-600">Strategi</span>
          <div className="mt-2 space-y-2">
            {strategies.map((s) => (
              <button
                key={s.id}
                onClick={() => set({ strategy: s.id })}
                className={clsx(
                  "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors",
                  inputs.strategy === s.id
                    ? "border-navy-900 bg-navy-900 text-cream-100"
                    : "border-stone-200 bg-white hover:border-stone-300",
                )}
              >
                <span className="text-sm font-medium">{s.label}</span>
                <span
                  className={clsx(
                    "text-xs",
                    inputs.strategy === s.id ? "text-cream-100/60" : "text-stone-400",
                  )}
                >
                  {s.hint}
                </span>
              </button>
            ))}
          </div>
        </div>

        <Button className="mt-6 w-full" onClick={() => setRan(true)}>
          Analysér nu
        </Button>
      </div>

      {/* RESULTS */}
      <div
        className={clsx(
          "rounded-2xl border border-stone-200 bg-cream-50 p-6 md:p-8 transition-opacity",
          ran ? "opacity-100" : "opacity-60",
        )}
      >
        {/* verdict header */}
        <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="micro text-gold-600">Investment Score</div>
            <div className={clsx("font-mono text-6xl font-light tnum", scoreColor)}>
              {result.score}
              <span className="text-2xl text-stone-300">/100</span>
            </div>
          </div>
          <div className="md:max-w-xs md:text-right">
            <span className="inline-block rounded-full bg-navy-900 px-3 py-1 text-xs text-cream-100">
              {strategies.find((s) => s.id === inputs.strategy)?.label} · {result.rating}
            </span>
            <p className="mt-3 font-serif text-lg italic text-stone-900">
              {result.verdict}
            </p>
          </div>
        </div>

        {/* metric cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { l: "Bruttoafkast", v: pct(result.grossYield), tone: "" },
            {
              l: "Cash flow",
              v: krMd(result.cashFlow),
              tone: result.cashFlow >= 0 ? "text-data-pos" : "text-data-neg",
            },
            { l: "Kontantafkast", v: pct(result.roi), tone: result.roi >= 0 ? "" : "text-data-neg" },
            { l: "Nettoafkast", v: pct(result.netYield), tone: "" },
          ].map((m) => (
            <div key={m.l} className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="text-[11px] uppercase tracking-wide text-stone-400">
                {m.l}
              </div>
              <div className={clsx("mt-1 font-mono text-lg tnum", m.tone)}>{m.v}</div>
            </div>
          ))}
        </div>

        {/* cashflow breakdown + stress test */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <div className="text-sm font-medium text-stone-900">Cash flow, månedligt</div>
            <dl className="mt-3 space-y-2 text-sm">
              <Row l="Lejeindtægt" v={krMd(inputs.monthlyRent)} pos />
              <Row l="Ydelse (realkredit)" v={"−" + krMd(result.monthlyMortgage)} />
              <Row l="Udgifter" v={"−" + krMd(inputs.monthlyExpenses)} />
              <div className="border-t border-stone-100 pt-2">
                <Row
                  l="Netto"
                  v={krMd(result.cashFlow)}
                  strong
                  pos={result.cashFlow >= 0}
                />
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <div className="text-sm font-medium text-stone-900">Rentestress-test</div>
            <dl className="mt-3 space-y-2 text-sm">
              <Row l="Nu" v={krMd(result.cashFlow)} pos={result.cashFlow >= 0} />
              {result.stress.map((s) => (
                <Row
                  key={s.rate}
                  l={`Ved ${pct(s.rate, 1)} rente`}
                  v={krMd(s.cashFlow)}
                  pos={s.cashFlow >= 0}
                />
              ))}
              <div className="border-t border-stone-100 pt-2">
                <Row l="Break-even ved" v={pct(result.breakEvenRate, 1)} strong />
              </div>
            </dl>
          </div>
        </div>

        {/* forecast chart */}
        <div className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
          <div className="text-sm font-medium text-stone-900">
            5-årig prisprognose <span className="text-stone-400">(3 % om året, DST EJ55-baseret)</span>
          </div>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.forecast} margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E1D6" />
                <XAxis
                  dataKey="year"
                  tickFormatter={(y) => `År ${y}`}
                  stroke="#A8A29E"
                  fontSize={12}
                />
                <YAxis
                  tickFormatter={(v) => `${(v / 1_000_000).toLocaleString("da-DK")} mio`}
                  stroke="#A8A29E"
                  fontSize={12}
                  width={56}
                />
                <Tooltip
                  formatter={(v: number) => [kr(v), "Værdi"]}
                  labelFormatter={(y) => `År ${y}`}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#B8935A"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#B8935A" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* actions */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href="/auth/signup">Gem til portefølje</Button>
          <Button variant="secondary" onClick={() => window.print()}>
            Eksportér til PDF
          </Button>
        </div>
        <p className="mt-3 text-xs text-stone-400">
          Gem, del og PDF-eksport kræver en gratis konto.
        </p>
      </div>
    </div>
  );
}

function Row({
  l,
  v,
  pos,
  strong,
}: {
  l: string;
  v: string;
  pos?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className={clsx("text-stone-500", strong && "font-medium text-stone-900")}>
        {l}
      </dt>
      <dd
        className={clsx(
          "font-mono tnum",
          strong && "font-medium",
          pos === true && "text-data-pos",
          pos === false && "text-data-neg",
        )}
      >
        {v}
      </dd>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
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

type Extract = { status: "idle" | "loading" | "ok" | "fail"; msg?: string };

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
      <span className="text-sm text-slate-600">{label}</span>
      <div className="mt-1 flex items-center rounded-xl border border-slate-200 bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
        <input
          type="number"
          value={value}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-xl bg-transparent px-3 py-2.5 font-semibold text-slate-900 tnum outline-none"
        />
        <span className="px-3 text-sm text-slate-400">{suffix}</span>
      </div>
    </label>
  );
}

export function AnalyzerApp() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [ran, setRan] = useState(false);
  const [extract, setExtract] = useState<Extract>({ status: "idle" });
  const set = (patch: Partial<Inputs>) => setInputs((p) => ({ ...p, ...patch }));

  // If the hero passed ?url=, try to pull price + m² from the listing.
  useEffect(() => {
    const url = new URLSearchParams(window.location.search).get("url");
    if (!url) return;
    setExtract({ status: "loading" });
    setRan(true);
    fetch(`/api/extract?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && (d.price || d.area)) {
          const patch: Partial<Inputs> = {};
          if (d.price) patch.price = d.price;
          if (d.area) {
            patch.monthlyRent = Math.round((d.area * 110) / 100) * 100; // ~110 kr/m²/md
            patch.monthlyExpenses = Math.round((d.area * 35) / 50) * 50; // ~35 kr/m²/md drift
          }
          setInputs((p) => ({ ...p, ...patch }));
          setExtract({
            status: "ok",
            msg: `Hentet fra annonce${d.area ? " — leje og udgifter er estimeret ud fra m²" : ""}. Ret tallene, hvis du kender dem.`,
          });
        } else {
          setExtract({
            status: "fail",
            msg: "Kunne ikke hente data automatisk fra dette link (siden blokerer måske automatisk hentning). Indtast tallene manuelt herunder.",
          });
        }
      })
      .catch(() =>
        setExtract({
          status: "fail",
          msg: "Kunne ikke hente data automatisk. Indtast tallene manuelt herunder.",
        }),
      );
  }, []);

  const result = useMemo(() => analyze(inputs), [inputs]);

  const scoreColor =
    result.score >= 65
      ? "text-emerald-600"
      : result.score >= 45
        ? "text-blue-600"
        : "text-rose-500";

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
      {/* INPUT PANEL */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Ejendommens tal</h2>
        <p className="mt-1 text-sm text-slate-500">
          Indsæt et boliglink på forsiden, eller ret tallene her.
        </p>

        {extract.status !== "idle" && (
          <div
            className={clsx(
              "mt-4 flex items-start gap-2 rounded-xl border p-3 text-xs",
              extract.status === "loading" && "border-slate-200 bg-slate-50 text-slate-600",
              extract.status === "ok" && "border-emerald-200 bg-emerald-50 text-emerald-800",
              extract.status === "fail" && "border-amber-200 bg-amber-50 text-amber-800",
            )}
          >
            {extract.status === "loading" ? (
              <Loader2 size={15} className="mt-0.5 shrink-0 animate-spin" />
            ) : extract.status === "ok" ? (
              <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
            ) : (
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
            )}
            <span>{extract.status === "loading" ? "Henter data fra annoncen…" : extract.msg}</span>
          </div>
        )}

        <div className="mt-6 space-y-4">
          <Field label="Købspris" value={inputs.price} onChange={(n) => set({ price: n })} suffix="kr" step={25000} />
          <Field label="Månedlig leje" value={inputs.monthlyRent} onChange={(n) => set({ monthlyRent: n })} suffix="kr/md." step={500} />
          <Field label="Udbetaling" value={inputs.downPaymentPct} onChange={(n) => set({ downPaymentPct: n })} suffix="%" />
          <Field label="Rente" value={inputs.interestRate} onChange={(n) => set({ interestRate: n })} suffix="% p.a." step={0.25} />
          <Field label="Månedlige udgifter" value={inputs.monthlyExpenses} onChange={(n) => set({ monthlyExpenses: n })} suffix="kr/md." step={250} />
        </div>

        <div className="mt-6">
          <span className="text-sm text-slate-600">Strategi</span>
          <div className="mt-2 space-y-2">
            {strategies.map((s) => (
              <button
                key={s.id}
                onClick={() => set({ strategy: s.id })}
                className={clsx(
                  "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-colors",
                  inputs.strategy === s.id
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white hover:border-slate-300",
                )}
              >
                <span className="text-sm font-medium">{s.label}</span>
                <span className={clsx("text-xs", inputs.strategy === s.id ? "text-slate-300" : "text-slate-400")}>
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
          "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-opacity md:p-8",
          ran ? "opacity-100" : "opacity-70",
        )}
      >
        {/* verdict header */}
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Investment Score
            </div>
            <div className={clsx("text-6xl font-bold tnum", scoreColor)}>
              {result.score}
              <span className="text-2xl font-semibold text-slate-300">/100</span>
            </div>
          </div>
          <div className="md:max-w-xs md:text-right">
            <span className="inline-block rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
              {strategies.find((s) => s.id === inputs.strategy)?.label} · {result.rating}
            </span>
            <p className="mt-3 text-lg font-medium text-slate-700">{result.verdict}</p>
          </div>
        </div>

        {/* metric cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { l: "Bruttoafkast", v: pct(result.grossYield), tone: "text-slate-900" },
            { l: "Cash flow", v: krMd(result.cashFlow), tone: result.cashFlow >= 0 ? "text-emerald-600" : "text-rose-500" },
            { l: "Kontantafkast", v: pct(result.roi), tone: result.roi >= 0 ? "text-slate-900" : "text-rose-500" },
            { l: "Nettoafkast", v: pct(result.netYield), tone: "text-slate-900" },
          ].map((m) => (
            <div key={m.l} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{m.l}</div>
              <div className={clsx("mt-1 text-lg font-bold tnum", m.tone)}>{m.v}</div>
            </div>
          ))}
        </div>

        {/* cashflow breakdown + stress test */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm font-semibold text-slate-900">Cash flow, månedligt</div>
            <dl className="mt-3 space-y-2 text-sm">
              <Row l="Lejeindtægt" v={krMd(inputs.monthlyRent)} pos />
              <Row l="Ydelse (realkredit)" v={"−" + krMd(result.monthlyMortgage)} />
              <Row l="Udgifter" v={"−" + krMd(inputs.monthlyExpenses)} />
              <div className="border-t border-slate-200 pt-2">
                <Row l="Netto" v={krMd(result.cashFlow)} strong pos={result.cashFlow >= 0} />
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm font-semibold text-slate-900">Rentestress-test</div>
            <dl className="mt-3 space-y-2 text-sm">
              <Row l="Nu" v={krMd(result.cashFlow)} pos={result.cashFlow >= 0} />
              {result.stress.map((s) => (
                <Row key={s.rate} l={`Ved ${pct(s.rate, 1)} rente`} v={krMd(s.cashFlow)} pos={s.cashFlow >= 0} />
              ))}
              <div className="border-t border-slate-200 pt-2">
                <Row l="Break-even ved" v={pct(result.breakEvenRate, 1)} strong />
              </div>
            </dl>
          </div>
        </div>

        {/* forecast chart */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="text-sm font-semibold text-slate-900">
            5-årig prisprognose{" "}
            <span className="font-normal text-slate-400">(3 % om året, DST EJ55-baseret)</span>
          </div>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.forecast} margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" tickFormatter={(y) => `År ${y}`} stroke="#94a3b8" fontSize={12} />
                <YAxis
                  tickFormatter={(v) => `${(v / 1_000_000).toLocaleString("da-DK")} mio`}
                  stroke="#94a3b8"
                  fontSize={12}
                  width={56}
                />
                <Tooltip formatter={(v) => [kr(Number(v)), "Værdi"]} labelFormatter={(y) => `År ${y}`} />
                <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3, fill: "#2563eb" }} />
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
        <p className="mt-3 text-xs text-slate-400">Gem, del og PDF-eksport kræver en gratis konto.</p>
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
      <dt className={clsx("text-slate-500", strong && "font-semibold text-slate-900")}>{l}</dt>
      <dd
        className={clsx(
          "tnum font-semibold",
          pos === true && "text-emerald-600",
          pos === false && "text-rose-500",
          pos === undefined && "text-slate-900",
        )}
      >
        {v}
      </dd>
    </div>
  );
}

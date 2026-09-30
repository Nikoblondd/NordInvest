"use client";

import { useEffect, useMemo, useState } from "react";
import { Printer, ArrowLeft, ShieldCheck } from "lucide-react";
import { analyze, kr, num, pct, type Strategy } from "@/lib/analysis";
import { runUncertainty } from "@/lib/uncertainty";

type ReportInputs = {
  price: number; monthlyRent: number; downPaymentPct: number; interestRate: number;
  termYears: number; monthlyOpex: number; vacancyPct: number; maintenancePct: number;
  acqCostPct: number; appreciationPct: number; rentGrowthPct: number; holdYears: number;
  strategy: Strategy;
};

type Payload = {
  inputs: ReportInputs;
  address: string | null;
  bbr: { byggeaar: number | null; area: number | null; rooms: number | null; energyLabel: string | null } | null;
  cal: { confidence: number; region: string | null; regionCount: number; tier: string } | null;
  rentEstimated: boolean;
  generatedAt: string;
};

const STRATEGY_LABEL: Record<Strategy, string> = {
  cashflow: "Cashflow", appreciation: "Værdistigning", value_add: "Value-add",
};

const dk = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString("da-DK") : "–");

export function BankReport() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    try {
      // localStorage is the primary channel (survives a `noopener` new tab);
      // sessionStorage is a fallback for same-tab navigations.
      const raw =
        (typeof localStorage !== "undefined" && localStorage.getItem("nordinvest:report")) ||
        (typeof sessionStorage !== "undefined" && sessionStorage.getItem("nordinvest:report"));
      if (!raw) { setNotFound(true); return; }
      setPayload(JSON.parse(raw) as Payload);
    } catch {
      setNotFound(true);
    }
  }, []);

  const model = useMemo(() => {
    if (!payload) return null;
    const r = analyze(payload.inputs);
    const u = runUncertainty(payload.inputs, {
      confidence: payload.cal?.confidence ?? 0,
      rentEstimated: payload.rentEstimated,
      runs: 3000,
    });
    return { r, u };
  }, [payload]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="text-xl font-bold text-slate-900">Ingen rapportdata</h1>
        <p className="mt-2 text-sm text-slate-500">
          Åbn en analyse på værktøjet og tryk “Download bankrapport” for at generere rapporten.
        </p>
        <a href="/analyseren" className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white">
          <ArrowLeft size={16} /> Til analyseværktøjet
        </a>
      </div>
    );
  }

  if (!payload || !model) {
    return <div className="px-6 py-24 text-center text-sm text-slate-400">Genererer rapport…</div>;
  }

  const { inputs, address, bbr, cal } = payload;
  const { r, u } = model;
  const genDate = new Date(payload.generatedAt).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" });
  const scoreColor = r.score >= 65 ? "#059669" : r.score >= 45 ? "#2563eb" : "#e11d48";
  const cfPos = r.cashFlow >= 0;

  return (
    <div className="report-root min-h-screen bg-slate-100 text-slate-900">
      <style>{`
        @page { size: A4; margin: 14mm 14mm 16mm; }
        @media print {
          .no-print { display: none !important; }
          .report-root { background: #fff !important; }
          .sheet { box-shadow: none !important; margin: 0 !important; width: 100% !important; border-radius: 0 !important; }
          .avoid-break { break-inside: avoid; }
        }
        .tnum { font-variant-numeric: tabular-nums; }
      `}</style>

      {/* screen-only action bar */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-5 py-3 backdrop-blur">
        <a href="/analyseren" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft size={16} /> Tilbage til analysen
        </a>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-btn ring-1 ring-inset ring-white/10 hover:bg-blue-700"
        >
          <Printer size={16} /> Gem som PDF / print
        </button>
      </div>

      {/* the printable sheet */}
      <div className="sheet mx-auto my-6 w-full max-w-[820px] bg-white p-5 shadow-xl sm:p-10 md:p-12">
        {/* header */}
        <header className="flex items-start justify-between gap-4 border-b-2 border-[#0f1f3d] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#0f1f3d] text-sm font-bold text-white">Ni</span>
              <span className="text-lg font-bold tracking-tight text-[#0f1f3d]">NordInvest</span>
            </div>
            <div className="mt-2 text-xs text-slate-400">Uafhængig investeringsanalyse · nordinvest.io</div>
          </div>
          <div className="text-right">
            <div className="text-base font-bold text-[#0f1f3d]">Investeringsrapport</div>
            <div className="mt-1 text-xs text-slate-400">Genereret {genDate}</div>
            <div className="mt-0.5 text-xs text-slate-400">Strategi: {STRATEGY_LABEL[inputs.strategy]}</div>
          </div>
        </header>

        {/* property */}
        <section className="avoid-break mt-6">
          <div className="text-lg font-bold text-slate-900">{address || "Ejendom uden adresse"}</div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Fact label="Købspris" value={kr(inputs.price)} />
            <Fact label="Boligareal" value={bbr?.area ? `${dk(bbr.area)} m²` : "–"} />
            <Fact label="Byggeår" value={bbr?.byggeaar ? String(bbr.byggeaar) : "–"} />
            <Fact label="Værelser" value={bbr?.rooms ? String(bbr.rooms) : "–"} />
            <Fact label="Månedlig leje" value={`${dk(inputs.monthlyRent)} kr`} />
          </div>
          {bbr && (
            <div className="mt-2 inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
              <ShieldCheck size={12} className="shrink-0" />
              <span>
                Beriget med officielle bygningsdata fra Bygnings- og Boligregistret (BBR) via Datafordeler ·{" "}
                <a
                  href="https://creativecommons.org/licenses/by/4.0/deed.da"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  CC BY 4.0
                </a>
              </span>
            </div>
          )}
        </section>

        {/* conclusion */}
        <section className="avoid-break mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Samlet vurdering</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl font-bold tnum" style={{ color: scoreColor }}>{r.score}</span>
                <span className="text-sm font-semibold text-slate-400">/100</span>
                <span className="ml-1 rounded-full bg-[#0f1f3d] px-2.5 py-0.5 text-xs font-medium text-white">{r.rating}</span>
              </div>
            </div>
            <div className="text-sm text-slate-600 sm:max-w-[52%] sm:text-right">{r.verdict}</div>
          </div>
        </section>

        {/* key metrics WITH confidence intervals — the heart of the report */}
        <section className="avoid-break mt-6">
          <h2 className="text-sm font-bold text-slate-900">Nøgletal med konfidensinterval</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Beregnet på {u.runs.toLocaleString("da-DK")} scenarier. Intervallet går fra konservativt (P10) til optimistisk (P90); forventet er medianen.
          </p>
          <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <table className="mt-3 w-full min-w-[440px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-400">
                <th className="py-2 font-semibold">Nøgletal</th>
                <th className="py-2 text-right font-semibold">Konservativt</th>
                <th className="py-2 text-right font-semibold">Forventet</th>
                <th className="py-2 text-right font-semibold">Optimistisk</th>
              </tr>
            </thead>
            <tbody className="tnum">
              <MetricRow name="Cash flow / md." lo={`${dk(u.cashFlow.p10)} kr`} mid={`${dk(u.cashFlow.p50)} kr`} hi={`${dk(u.cashFlow.p90)} kr`} />
              <MetricRow name="Nettoafkast (cap rate)" lo={`${num(u.capRate.p10)} %`} mid={`${num(u.capRate.p50)} %`} hi={`${num(u.capRate.p90)} %`} />
              <MetricRow name="Kontantafkast (cash-on-cash)" lo={`${num(u.cashOnCash.p10)} %`} mid={`${num(u.cashOnCash.p50)} %`} hi={`${num(u.cashOnCash.p90)} %`} />
              <MetricRow name={`IRR (${r.holdYears} år)`} lo={`${num(u.irr.p10)} %`} mid={`${num(u.irr.p50)} %`} hi={`${num(u.irr.p90)} %`} />
              <MetricRow name="Samlet gevinst" lo={`${dk(u.totalProfit.p10)} kr`} mid={`${dk(u.totalProfit.p50)} kr`} hi={`${dk(u.totalProfit.p90)} kr`} />
            </tbody>
          </table>
          </div>
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            <b className="text-slate-900">{Math.round(u.pCashFlowPositive * 100)} %</b> af scenarierne giver positivt cash flow.
            Selv i det konservative scenarie (P10) er cash flow <b className="text-slate-900">{dk(u.cashFlow.p10)} kr/md.</b>
          </div>
        </section>

        {/* budget + financing */}
        <section className="avoid-break mt-6 grid gap-4 sm:grid-cols-2">
          <Panel title="Driftsbudget (år 1)">
            <PRow l="Lejeindtægt" v={kr(r.annualRent)} />
            <PRow l="− Tomgang" v={"−" + kr(r.opex.vacancy)} />
            <PRow l="− Vedligehold" v={"−" + kr(r.opex.maintenance)} />
            <PRow l="− Faste udgifter" v={"−" + kr(r.opex.fixed)} />
            <PRow l="= NOI" v={kr(r.noi)} strong />
            <PRow l="− Ydelse (år)" v={"−" + kr(r.monthlyMortgage * 12)} />
            <PRow l="= Cash flow (år)" v={kr(r.annualCashFlow)} strong tone={r.annualCashFlow >= 0 ? "#059669" : "#e11d48"} />
          </Panel>
          <Panel title="Finansiering">
            <PRow l="Købspris" v={kr(inputs.price)} />
            <PRow l="Udbetaling" v={`${kr(r.downPayment)} (${num(inputs.downPaymentPct, 0)} %)`} />
            <PRow l="Købsomkostninger" v={kr(r.cashInvested - r.downPayment)} />
            <PRow l="Investeret i alt" v={kr(r.cashInvested)} strong />
            <PRow l="Lån" v={kr(r.loan)} />
            <PRow l="Belåningsgrad (LTV)" v={pct(r.ltv, 0)} />
            <PRow l="Rente / løbetid" v={`${num(inputs.interestRate, 2)} % · ${inputs.termYears} år`} />
            <PRow l="Månedlig ydelse" v={`${dk(r.monthlyMortgage)} kr`} />
          </Panel>
        </section>

        {/* stress test */}
        <section className="avoid-break mt-4 rounded-2xl border border-slate-200 p-5">
          <div className="text-sm font-semibold text-slate-900">Rentestress-test</div>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-4">
            <PRow l="Cash flow nu" v={`${dk(r.cashFlow)} kr/md.`} tone={cfPos ? "#059669" : "#e11d48"} />
            {r.stress.map((s) => (
              <PRow key={s.rate} l={`Ved ${num(s.rate, 1)} %`} v={`${dk(s.cashFlow)} kr/md.`} tone={s.cashFlow >= 0 ? "#059669" : "#e11d48"} />
            ))}
            <PRow l="Break-even rente" v={pct(r.breakEvenRate, 1)} strong />
            <PRow l="DSCR (gældsdækning)" v={num(r.dscr)} />
            <PRow l="Break-even belægning" v={`${num(r.breakEvenOccupancy, 0)} %`} />
          </div>
        </section>

        {/* projection table */}
        <section className="avoid-break mt-6">
          <h2 className="text-sm font-bold text-slate-900">{r.holdYears}-årig prognose</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Værdistigning {pct(inputs.appreciationPct, 0)}/år · lejevækst {pct(inputs.rentGrowthPct, 0)}/år
          </p>
          <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <table className="mt-3 w-full min-w-[520px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left uppercase tracking-wide text-slate-400">
                <th className="py-1.5 font-semibold">År</th>
                <th className="py-1.5 text-right font-semibold">Ejendomsværdi</th>
                <th className="py-1.5 text-right font-semibold">Restgæld</th>
                <th className="py-1.5 text-right font-semibold">Friværdi</th>
                <th className="py-1.5 text-right font-semibold">Cash flow</th>
                <th className="py-1.5 text-right font-semibold">Kum. cash flow</th>
              </tr>
            </thead>
            <tbody className="tnum">
              {r.projection.filter((_, i) => i === 0 || (i + 1) % (r.holdYears > 12 ? 2 : 1) === 0 || i === r.projection.length - 1).map((y) => (
                <tr key={y.year} className="border-b border-slate-100">
                  <td className="py-1.5 font-medium text-slate-700">{y.year}</td>
                  <td className="py-1.5 text-right text-slate-600">{dk(y.propertyValue)}</td>
                  <td className="py-1.5 text-right text-slate-600">{dk(y.loanBalance)}</td>
                  <td className="py-1.5 text-right text-slate-600">{dk(y.equity)}</td>
                  <td className="py-1.5 text-right" style={{ color: y.cashFlow >= 0 ? "#059669" : "#e11d48" }}>{dk(y.cashFlow)}</td>
                  <td className="py-1.5 text-right font-medium text-slate-800">{dk(y.cumulativeCashFlow)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Fact label="Nettoprovenu ved salg" value={kr(r.netSaleProceeds)} />
            <Fact label="Equity multiple" value={`${num(r.equityMultiple)}x`} />
            <Fact label="Samlet gevinst" value={kr(r.totalProfit)} />
          </div>
        </section>

        {/* method + confidence */}
        <section className="avoid-break mt-6 rounded-2xl bg-slate-50 p-5 text-xs text-slate-500">
          <div className="font-semibold text-slate-700">Metode & datagrundlag</div>
          <p className="mt-1.5 leading-relaxed">
            Nøgletal er beregnet med en annuitetslånemodel og et driftsbudget efter tomgang, vedligehold og faste udgifter.
            Konfidensintervaller stammer fra {u.runs.toLocaleString("da-DK")} Monte Carlo-scenarier, hvor leje (±{Math.round(u.assumptions.rentSigmaPct * 100)} %),
            rente (±{num(u.assumptions.interestSigmaPp, 1)} pp), værdistigning (±{num(u.assumptions.appreciationSigmaPp, 1)} pp), tomgang og udgifter varieres.
            {cal && cal.regionCount > 0
              ? ` Modellen er kalibreret på ${cal.regionCount} faktiske handler i ${cal.region ?? "regionen"}.`
              : " Modellen kalibreres løbende med faktiske handler."}
          </p>
        </section>

        {/* footer / disclaimer — with proper CC BY 4.0 attribution for the
            BBR data if it was used in the report. */}
        <footer className="mt-6 space-y-1.5 border-t border-slate-200 pt-4 text-[10px] leading-relaxed text-slate-400">
          <div>
            Denne rapport er et beslutningsstøtteværktøj og udgør ikke finansiel, juridisk eller skattemæssig rådgivning.
            Tallene bygger på de indtastede/hentede oplysninger og angivne antagelser. Verificér altid nøgletal mod kilder
            og egne forudsætninger inden en investeringsbeslutning.
          </div>
          {bbr && (
            <div>
              Kilde til bygningsdata: Bygnings- og Boligregistret (BBR) via{" "}
              <a href="https://datafordeler.dk" target="_blank" rel="noopener noreferrer" className="underline">Datafordeler</a>
              , licens{" "}
              <a href="https://creativecommons.org/licenses/by/4.0/deed.da" target="_blank" rel="noopener noreferrer" className="underline">CC BY 4.0</a>
              .
            </div>
          )}
          <div>© {new Date().getFullYear()} NordInvest · nordinvest.io</div>
        </footer>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-900 tnum">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-5">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <dl className="mt-3 space-y-1.5 text-sm">{children}</dl>
    </div>
  );
}

function PRow({ l, v, strong, tone }: { l: string; v: string; strong?: boolean; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={strong ? "font-semibold text-slate-900" : "text-slate-500"}>{l}</dt>
      <dd className="shrink-0 whitespace-nowrap font-semibold tnum" style={tone ? { color: tone } : undefined}>{v}</dd>
    </div>
  );
}

function MetricRow({ name, lo, mid, hi }: { name: string; lo: string; mid: string; hi: string }) {
  return (
    <tr className="border-b border-slate-100">
      <td className="py-2 font-medium text-slate-700">{name}</td>
      <td className="py-2 text-right text-slate-500">{lo}</td>
      <td className="py-2 text-right font-bold text-slate-900">{mid}</td>
      <td className="py-2 text-right text-slate-500">{hi}</td>
    </tr>
  );
}

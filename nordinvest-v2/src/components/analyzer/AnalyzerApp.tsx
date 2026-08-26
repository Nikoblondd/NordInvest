"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { Loader2, CheckCircle2, AlertCircle, Sparkles, FileSpreadsheet, ChevronDown, HelpCircle, X } from "lucide-react";
import { analyze, kr, krMd, pct, num, type Strategy } from "@/lib/analysis";
import { Button } from "@/components/ui/Button";
import { clsx } from "@/lib/clsx";

type Inputs = {
  price: number; monthlyRent: number; downPaymentPct: number; interestRate: number;
  termYears: number; monthlyOpex: number; vacancyPct: number; maintenancePct: number;
  acqCostPct: number; appreciationPct: number; rentGrowthPct: number; holdYears: number;
  strategy: Strategy;
};

const DEFAULTS: Inputs = {
  price: 4_300_000, monthlyRent: 21_500, downPaymentPct: 20, interestRate: 5.0,
  termYears: 30, monthlyOpex: 3_800, vacancyPct: 4, maintenancePct: 8,
  acqCostPct: 1.5, appreciationPct: 3, rentGrowthPct: 2, holdYears: 10, strategy: "cashflow",
};

const strategies: { id: Strategy; label: string }[] = [
  { id: "cashflow", label: "Cashflow" },
  { id: "appreciation", label: "Værdistigning" },
  { id: "value_add", label: "Value-add" },
];

const FIELD_LABELS: Record<string, string> = {
  price: "pris", area: "m²", rooms: "værelser", yearBuilt: "byggeår", energyLabel: "energimærke",
  monthlyExpenses: "ejerudgift", annualRent: "lejeindtægt", monthlyRent: "leje", yieldPct: "afkast", address: "adresse",
};

type Extract = { status: "idle" | "loading" | "ok" | "fail"; stage?: string; msg?: string; found?: string[]; estimated?: string[] };

function Field({ label, value, onChange, suffix, step = 1 }: {
  label: string; value: number; onChange: (n: number) => void; suffix: string; step?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="mt-1 flex items-center rounded-xl border border-slate-200 bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
        <input type="number" value={value} step={step} onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-xl bg-transparent px-3 py-2.5 font-semibold text-slate-900 tnum outline-none" />
        <span className="px-3 text-sm text-slate-400">{suffix}</span>
      </div>
    </label>
  );
}

function Metric({
  label, value, unit = "", tone = "text-slate-900", hint, explain, how,
}: {
  label: string; value: string; unit?: string; tone?: string; hint?: string; explain?: string; how?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="group relative flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-medium uppercase leading-tight tracking-wide text-slate-400">{label}</div>
        {explain && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="-mr-1 -mt-1 flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-slate-400 opacity-70 transition-all hover:bg-blue-50 hover:text-blue-600 group-hover:opacity-100"
          >
            <HelpCircle size={13} />
            <span className="hidden sm:inline">Forklar</span>
          </button>
        )}
      </div>
      <div className={clsx("mt-1 whitespace-nowrap font-bold tnum", tone)}>
        <span className="text-xl">{value}</span>
        {unit && <span className="ml-1 text-sm font-semibold text-slate-400">{unit}</span>}
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-slate-400">{hint}</div>}

      {open && explain && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xl shadow-slate-900/10">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-slate-900">{label}</div>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700"><X size={15} /></button>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{explain}</p>
          {how && (
            <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Sådan regnes det: </span>{how}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function AnalyzerApp() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [address, setAddress] = useState<string | null>(null);
  const [ran, setRan] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [ex, setEx] = useState<Extract>({ status: "idle" });
  const set = (patch: Partial<Inputs>) => setInputs((p) => ({ ...p, ...patch }));

  useEffect(() => {
    const url = new URLSearchParams(window.location.search).get("url");
    if (!url) return;
    setRan(true);
    let cancelled = false;
    const run = async () => {
      const stages = ["Henter annoncen…", "Læser nøgletal (pris, m², leje, udgifter)…", "Beregner afkast og risiko…"];
      setEx({ status: "loading", stage: stages[0] });
      const started = Date.now();
      const p = fetch(`/api/extract?url=${encodeURIComponent(url)}`).then((r) => r.json()).catch(() => ({ ok: false }));
      // staged messages for a thorough feel
      setTimeout(() => !cancelled && setEx((s) => (s.status === "loading" ? { ...s, stage: stages[1] } : s)), 900);
      setTimeout(() => !cancelled && setEx((s) => (s.status === "loading" ? { ...s, stage: stages[2] } : s)), 1900);
      const d = await p;
      const elapsed = Date.now() - started;
      if (elapsed < 2600) await new Promise((r) => setTimeout(r, 2600 - elapsed));
      if (cancelled) return;

      if (d.ok && d.fields) {
        const fld = d.fields as Record<string, number | string>;
        const patch: Partial<Inputs> = {};
        const estimated: string[] = [];
        if (fld.price) patch.price = Number(fld.price);
        if (fld.monthlyRent) patch.monthlyRent = Number(fld.monthlyRent);
        else if (fld.area) { patch.monthlyRent = Math.round((Number(fld.area) * 110) / 100) * 100; estimated.push("leje"); }
        if (fld.monthlyExpenses) patch.monthlyOpex = Number(fld.monthlyExpenses);
        else if (fld.area) { patch.monthlyOpex = Math.round((Number(fld.area) * 35) / 50) * 50; estimated.push("faste udgifter"); }
        if (fld.address) setAddress(String(fld.address));
        setInputs((prev) => ({ ...prev, ...patch }));
        setEx({ status: "ok", found: (d.found as string[]) ?? [], estimated });
      } else {
        setEx({ status: "fail", msg: "Kunne ikke hente data automatisk fra dette link (siden blokerer måske automatisk hentning, eller viser tallene via JavaScript). Indtast tallene manuelt herunder — analysen er lige så præcis." });
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  const r = useMemo(() => analyze(inputs), [inputs]);
  const scoreColor = r.score >= 65 ? "text-emerald-600" : r.score >= 45 ? "text-blue-600" : "text-rose-500";
  const cfTone = r.cashFlow >= 0 ? "text-emerald-600" : "text-rose-500";
  const dscrTone = r.dscr >= 1.2 ? "text-emerald-600" : r.dscr >= 1 ? "text-blue-600" : "text-rose-500";
  const dk = (n: number) => Math.round(n).toLocaleString("da-DK");

  const chartData = r.projection.map((y) => ({ year: y.year, Friværdi: y.equity, "Kumuleret cash flow": y.cumulativeCashFlow }));

  const exportExcel = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, ...inputs }),
      });
      const blob = await res.blob();
      const u = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = u; link.download = "NordInvest-analyse.xlsx"; link.click();
      URL.revokeObjectURL(u);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
      {/* INPUT PANEL */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-24 lg:self-start">
        <h2 className="text-xl font-bold">Ejendommens tal</h2>
        <p className="mt-1 text-sm text-slate-500">Indsæt et boliglink på forsiden, eller ret tallene her.</p>

        {ex.status !== "idle" && (
          <div className={clsx("mt-4 flex items-start gap-2 rounded-xl border p-3 text-xs",
            ex.status === "loading" && "border-blue-200 bg-blue-50 text-blue-800",
            ex.status === "ok" && "border-emerald-200 bg-emerald-50 text-emerald-800",
            ex.status === "fail" && "border-amber-200 bg-amber-50 text-amber-800")}>
            {ex.status === "loading" ? <Loader2 size={15} className="mt-0.5 shrink-0 animate-spin" />
              : ex.status === "ok" ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
              : <AlertCircle size={15} className="mt-0.5 shrink-0" />}
            <span>
              {ex.status === "loading" && ex.stage}
              {ex.status === "ok" && (
                <>Hentet fra annoncen: <b>{(ex.found ?? []).filter((k) => FIELD_LABELS[k]).map((k) => FIELD_LABELS[k]).join(", ") || "grunddata"}</b>
                  {ex.estimated && ex.estimated.length > 0 && <> · estimeret: {ex.estimated.join(", ")}</>}. Ret gerne tallene.</>
              )}
              {ex.status === "fail" && ex.msg}
            </span>
          </div>
        )}

        <div className="mt-6 space-y-4">
          <Field label="Købspris" value={inputs.price} onChange={(n) => set({ price: n })} suffix="kr" step={25000} />
          <Field label="Månedlig leje" value={inputs.monthlyRent} onChange={(n) => set({ monthlyRent: n })} suffix="kr/md." step={500} />
          <Field label="Udbetaling" value={inputs.downPaymentPct} onChange={(n) => set({ downPaymentPct: n })} suffix="%" />
          <Field label="Rente" value={inputs.interestRate} onChange={(n) => set({ interestRate: n })} suffix="% p.a." step={0.25} />
          <Field label="Faste udgifter" value={inputs.monthlyOpex} onChange={(n) => set({ monthlyOpex: n })} suffix="kr/md." step={250} />
        </div>

        <button onClick={() => setAdvanced((v) => !v)} className="mt-5 flex w-full items-center justify-between text-sm font-medium text-slate-600 hover:text-slate-900">
          Avancerede antagelser
          <ChevronDown size={16} className={clsx("transition-transform", advanced && "rotate-180")} />
        </button>
        {advanced && (
          <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
            <Field label="Løbetid" value={inputs.termYears} onChange={(n) => set({ termYears: n })} suffix="år" />
            <Field label="Tomgang" value={inputs.vacancyPct} onChange={(n) => set({ vacancyPct: n })} suffix="%" step={0.5} />
            <Field label="Vedligehold (af leje)" value={inputs.maintenancePct} onChange={(n) => set({ maintenancePct: n })} suffix="%" step={0.5} />
            <Field label="Købsomkostninger" value={inputs.acqCostPct} onChange={(n) => set({ acqCostPct: n })} suffix="%" step={0.5} />
            <Field label="Værdistigning" value={inputs.appreciationPct} onChange={(n) => set({ appreciationPct: n })} suffix="%/år" step={0.5} />
            <Field label="Lejevækst" value={inputs.rentGrowthPct} onChange={(n) => set({ rentGrowthPct: n })} suffix="%/år" step={0.5} />
            <Field label="Ejerperiode" value={inputs.holdYears} onChange={(n) => set({ holdYears: n })} suffix="år" />
          </div>
        )}

        <div className="mt-5">
          <span className="text-sm text-slate-600">Strategi</span>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {strategies.map((s) => (
              <button key={s.id} onClick={() => set({ strategy: s.id })}
                className={clsx("rounded-xl border px-2 py-2 text-xs font-medium transition-colors",
                  inputs.strategy === s.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white hover:border-slate-300")}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <Button className="mt-6 w-full" onClick={() => setRan(true)}>Analysér nu</Button>
      </div>

      {/* RESULTS */}
      <div className={clsx("space-y-6 transition-opacity", ran ? "opacity-100" : "opacity-70")}>
        {/* verdict header */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          {address && <div className="mb-3 text-sm font-medium text-slate-500">{address}</div>}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">Investment Score</div>
              <div className={clsx("text-6xl font-bold tnum", scoreColor)}>{r.score}<span className="text-2xl font-semibold text-slate-300">/100</span></div>
            </div>
            <div className="md:max-w-sm md:text-right">
              <span className="inline-block rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                {strategies.find((s) => s.id === inputs.strategy)?.label} · {r.rating}
              </span>
              <p className="mt-3 text-lg font-medium text-slate-700">{r.verdict}</p>
            </div>
          </div>
        </div>

        {/* headline metrics — what an investor checks first */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Metric
            label="Nettoafkast (cap rate)" value={num(r.capRate)} unit="%"
            explain={`Hvor mange procent af prisen ejendommen tjener om året — efter driftsudgifter, men før lån. Ligesom renten på en opsparing. ${num(r.capRate)} % betyder, at ejendommen selv (uden lån) giver ${num(r.capRate)} % af sin pris tilbage hvert år. Højere = bedre.`}
            how="Driftsresultatet (leje minus tomgang, vedligehold og faste udgifter) delt med købsprisen."
          />
          <Metric
            label="Cash flow / md." value={dk(r.cashFlow)} unit="kr/md." tone={cfTone}
            explain="Det, der reelt lander på din konto hver måned, når lejen har betalt lånet og alle udgifter. Positivt = ejendommen betaler dig. Negativt = du lægger penge til hver måned."
            how="Månedlig leje minus ydelsen på lånet minus alle driftsudgifter."
          />
          <Metric
            label="Kontantafkast" value={num(r.cashOnCash)} unit="%" hint="cash-on-cash, år 1"
            tone={r.cashOnCash >= 0 ? "text-slate-900" : "text-rose-500"}
            explain={`Hvor meget dine EGNE penge tjener om året. Du lagde ${dk(r.cashInvested)} kr (udbetaling + købsomkostninger) og får ${dk(r.annualCashFlow)} kr tilbage i cash flow — det er ${num(r.cashOnCash)} %. Tænk på det som renten på præcis de penge, du selv puttede i.`}
            how="Årligt cash flow delt med de penge, du selv lagde."
          />
          <Metric
            label="DSCR" value={num(r.dscr)} tone={dscrTone} hint="gældsdækning"
            explain={`Kan lejen betale lånet? 1,0 er lige akkurat. ${num(r.dscr)} betyder, at ejendommen tjener ${num(r.dscr)} gange så meget som ydelsen — masser af luft. Banker vil typisk gerne se mindst 1,25.`}
            how="Driftsresultatet (NOI) delt med den årlige ydelse på lånet."
          />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Metric
            label="Bruttoafkast" value={num(r.grossYield)} unit="%"
            explain={`Årlig leje i forhold til prisen — FØR udgifter. Et hurtigt førstetjek. ${num(r.grossYield)} % betyder, at lejen svarer til ${num(r.grossYield)} % af prisen om året. Nettoafkastet er det mere ærlige tal, fordi det trækker udgifter fra.`}
            how="Årlig leje delt med købsprisen."
          />
          <Metric
            label={`IRR (${r.holdYears} år)`} value={num(r.irr)} unit="%"
            tone={isFinite(r.irr) && r.irr >= 8 ? "text-emerald-600" : "text-slate-900"}
            explain="Det samlede årlige afkast på dine penge over hele perioden — cash flow OG værdistigning lagt sammen til én procent. Hvis du satte pengene i banken til denne rente, ville du ende samme sted. Over 8–10 % er stærkt."
            how="Alle pengestrømme (udbetaling ud nu, cash flow ind hvert år, salg til sidst) regnet om til én årlig rente."
          />
          <Metric
            label="Equity multiple" value={num(r.equityMultiple)} unit="x"
            explain={`Hvor mange gange du får dine penge igen i alt. ${num(r.equityMultiple)}x betyder: for hver 1 krone du lagde, får du ${num(r.equityMultiple)} kr tilbage over perioden — cash flow undervejs plus gevinsten, når du sælger.`}
            how="Alt du får ud (samlet cash flow + nettoprovenu ved salg) delt med det, du selv lagde."
          />
          <Metric
            label="Break-even belægning" value={num(r.breakEvenOccupancy, 0)} unit="%" hint="tomgang før nul"
            explain={`Hvor tom ejendommen må stå, før du taber penge. ${num(r.breakEvenOccupancy, 0)} % betyder: selv hvis den kun er udlejet ${num(r.breakEvenOccupancy, 0)} % af tiden, går det lige op. Lavere tal = mere sikkerhed og buffer.`}
            how="Hvor stor en del af lejen, der skal til for at dække lån og udgifter."
          />
        </div>

        {/* budget + financing + stress */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">Driftsbudget (år 1)</div>
            <dl className="mt-3 space-y-2 text-sm">
              <Row l="Lejeindtægt" v={kr(r.annualRent)} pos />
              <Row l="− Tomgang" v={"−" + kr(r.opex.vacancy)} />
              <Row l="− Vedligehold" v={"−" + kr(r.opex.maintenance)} />
              <Row l="− Faste udgifter" v={"−" + kr(r.opex.fixed)} />
              <div className="border-t border-slate-200 pt-2"><Row l="= NOI" v={kr(r.noi)} strong /></div>
              <Row l="− Ydelse" v={"−" + kr(r.monthlyMortgage * 12)} />
              <div className="border-t border-slate-200 pt-2"><Row l="= Cash flow (år)" v={kr(r.annualCashFlow)} strong pos={r.annualCashFlow >= 0} /></div>
            </dl>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">Finansiering</div>
            <dl className="mt-3 space-y-2 text-sm">
              <Row l="Købspris" v={kr(inputs.price)} />
              <Row l="Udbetaling" v={kr(r.downPayment)} />
              <Row l="Købsomk." v={kr(r.cashInvested - r.downPayment)} />
              <div className="border-t border-slate-200 pt-2"><Row l="Investeret" v={kr(r.cashInvested)} strong /></div>
              <Row l="Lån" v={kr(r.loan)} />
              <Row l="Belåningsgrad" v={pct(r.ltv, 0)} />
              <Row l="Månedlig ydelse" v={krMd(r.monthlyMortgage)} />
            </dl>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">Rentestress-test</div>
            <dl className="mt-3 space-y-2 text-sm">
              <Row l="Cash flow nu" v={krMd(r.cashFlow)} pos={r.cashFlow >= 0} />
              {r.stress.map((s) => (
                <Row key={s.rate} l={`Ved ${pct(s.rate, 1)} rente`} v={krMd(s.cashFlow)} pos={s.cashFlow >= 0} />
              ))}
              <div className="border-t border-slate-200 pt-2"><Row l="Break-even rente" v={pct(r.breakEvenRate, 1)} strong /></div>
              <Row l="DSCR" v={num(r.dscr)} />
            </dl>
          </div>
        </div>

        {/* projection */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">{r.holdYears}-årig prognose</div>
            <div className="text-xs text-slate-400">Værdistigning {pct(inputs.appreciationPct, 0)}/år · lejevækst {pct(inputs.rentGrowthPct, 0)}/år</div>
          </div>
          <div className="mt-4 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" tickFormatter={(y) => `År ${y}`} stroke="#94a3b8" fontSize={12} />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000).toLocaleString("da-DK")}k`} stroke="#94a3b8" fontSize={12} width={48} />
                <Tooltip formatter={(v) => kr(Number(v))} labelFormatter={(y) => `År ${y}`} />
                <Legend />
                <Line type="monotone" dataKey="Friværdi" stroke="#2563eb" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="Kumuleret cash flow" stroke="#10b981" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-4">
            <Metric label="Nettoprovenu ved salg" value={dk(r.netSaleProceeds)} unit="kr" />
            <Metric label="Samlet gevinst" value={dk(r.totalProfit)} unit="kr" tone={r.totalProfit >= 0 ? "text-emerald-600" : "text-rose-500"} />
            <Metric label="Equity multiple" value={num(r.equityMultiple)} unit="x" />
            <Metric label={`IRR (${r.holdYears} år)`} value={num(r.irr)} unit="%" />
          </div>
        </div>

        {/* actions */}
        <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <button onClick={exportExcel} disabled={exporting}
            className="flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700 disabled:opacity-60">
            {exporting ? <Loader2 size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
            Eksportér til Excel
          </button>
          <Button href="/auth/signup" variant="secondary">Gem til portefølje</Button>
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <Sparkles size={13} /> Excel-modellen er redigerbar — ret antagelserne og alt regner sig selv.
          </span>
        </div>
      </div>
    </div>
  );
}

function Row({ l, v, pos, strong }: { l: string; v: string; pos?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={clsx("min-w-0 text-slate-500", strong && "font-semibold text-slate-900")}>{l}</dt>
      <dd className={clsx("shrink-0 whitespace-nowrap tnum font-semibold tabular-nums", pos === true && "text-emerald-600", pos === false && "text-rose-500", pos === undefined && "text-slate-900")}>{v}</dd>
    </div>
  );
}

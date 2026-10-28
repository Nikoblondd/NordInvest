/* eslint-disable @next/next/no-img-element -- listing photos come from the agents' image servers */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { analyzedHomes } from "@/lib/deals-snapshot";
import { dealCity } from "@/lib/deal-cities";
import { getUdlejerindeks } from "@/lib/udlejerindeks";
import { PRESS_REPORTS } from "@/lib/press-reports";
import type { AnalyzedDeal } from "@/lib/deals";

/*
 * /presse/<token>: a private analysis for one journalist (lib/press-reports).
 * Per kommune: how many homes for sale give plus as a rental, the rank among
 * the kommuner, price per m², gross yield, the best homes and the full list,
 * counted exactly as on /deals/<kommune>. Not indexed, linked from nowhere.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata: Metadata = { title: "Analyse til pressen", robots: { index: false, follow: false } };

const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const share = (p: number, n: number) => { const s = n ? (p / n) * 100 : 0; return s > 0 && s < 0.5 ? "under 1" : Math.round(s).toString(); };
const median = (xs: number[]) => { const s = xs.filter(Number.isFinite).sort((a, b) => a - b); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const TYPE: Record<string, string> = { condo: "Ejerlejlighed", villa: "Villa", "terraced house": "Rækkehus" };
const opex = (h: AnalyzedDeal) => h.monthlyExpense ?? Math.round(((h.area ?? 0) * 35) / 50) * 50;
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(Math.round(n)).toLocaleString("da-DK")} kr.`;

export default async function PressReportPage({ params }: { params: { token: string } }) {
  const report = PRESS_REPORTS[params.token];
  if (!report) notFound();
  const cities = report.kommuner.map((s) => dealCity(s)).filter((c): c is NonNullable<ReturnType<typeof dealCity>> => !!c);
  const [lists, idx] = await Promise.all([Promise.all(cities.map((c) => analyzedHomes(c.slug))), getUdlejerindeks().catch(() => null)]);
  const data = cities.map((c, i) => {
    const homes = [...lists[i]].sort((a, b) => b.cashFlow - a.cashFlow);
    const plus = homes.filter((h) => h.cashFlow > 0).length;
    return { c, homes, plus, rank: idx?.rows.find((r) => r.slug === c.slug)?.rank ?? null, m2: median(homes.filter((h) => h.area).map((h) => h.price / (h.area as number))), yield: median(homes.map((h) => h.grossYield)) };
  });
  const date = new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Copenhagen" }).format(new Date());
  const xlsx = `/api/presse/regneark?kommuner=${cities.map((c) => c.slug).join(",")}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-blue-700">Analyse til {report.name}, {report.outlet}</p>
        <h1 className="mt-2 max-w-3xl text-2xl font-bold tracking-tight [text-wrap:balance] sm:text-4xl">Hvor kan lejen betale lånet? {cities.map((c) => c.name).join(", ").replace(/, ([^,]*)$/, " og $1")}</h1>
        <p className="mt-3 max-w-2xl text-slate-600 sm:text-lg">
          Alle ejerlejligheder, villaer og rækkehuse til salg i de fire kommuner, regnet igennem som udlejning. Opgjort {date}.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.map(({ c, homes, plus, rank }) => (
            <a key={c.slug} href={`#${c.slug}`} className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 transition-shadow hover:shadow-md">
              <p className="text-[15px] font-semibold">{c.name}</p>
              <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight text-[#0b1b33]">{share(plus, homes.length)} %</p>
              <p className="mt-1 text-[14px] text-slate-600">{plus.toLocaleString("da-DK")} af {homes.length.toLocaleString("da-DK")} boliger giver plus</p>
              {rank && idx && <p className="mt-2 text-[13px] font-medium text-slate-500">Nr. {rank} af {idx.ranked} kommuner</p>}
            </a>
          ))}
        </div>

        {data.map(({ c, homes, plus, rank, m2, yield: gy }) => (
          <section key={c.slug} id={c.slug} className="mt-12 scroll-mt-6">
            <h2 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">{c.name}</h2>
            <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-slate-200 ring-1 ring-slate-200 sm:grid-cols-4">
              {[["Giver plus", `${plus} af ${homes.length} (${share(plus, homes.length)} %)`], ["Placering", rank && idx ? `Nr. ${rank} af ${idx.ranked}` : "–"], ["Medianpris pr. m²", m2 ? kr(m2) : "–"], ["Typisk bruttoafkast", gy != null ? `${gy.toFixed(1).replace(".", ",")} %` : "–"]].map(([k, v]) => (
                <div key={k} className="bg-white px-4 py-3"><dt className="text-[12px] text-slate-500">{k}</dt><dd className="mt-0.5 text-[16px] font-semibold tabular-nums">{v}</dd></div>
              ))}
            </dl>

            <h3 className="mt-6 text-[15px] font-semibold">Boligerne, der regner bedst</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {homes.slice(0, 3).map((h) => (
                <a key={h.id} href={h.url} target="_blank" rel="noopener" className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 hover:shadow-md">
                  {h.image ? <img src={h.image} alt={h.road || h.address} className="aspect-[16/10] w-full object-cover" loading="lazy" /> : <div className="aspect-[16/10] bg-slate-100" />}
                  <div className="p-4">
                    <p className="truncate text-[15px] font-semibold">{h.road || h.address}</p>
                    <p className="text-[13px] text-slate-500">{TYPE[h.type] ?? "Bolig"} · {kr(h.price)}{h.area ? ` · ${h.area} m²` : ""}</p>
                    <p className={`mt-2 text-[15px] font-semibold tabular-nums ${h.cashFlow >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{signed(h.cashFlow)} om måneden</p>
                  </div>
                </a>
              ))}
            </div>

            <details className="group mt-4 rounded-2xl bg-white ring-1 ring-slate-200">
              <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-[15px] font-semibold">Alle {homes.length} boliger i {c.name}<span className="text-blue-700 group-open:hidden">Vis</span><span className="hidden text-blue-700 group-open:inline">Skjul</span></summary>
              <div className="overflow-x-auto border-t border-slate-100">
                <table className="w-full min-w-[760px] text-left text-[13px] tabular-nums">
                  <thead className="bg-slate-50 text-slate-500"><tr>{["Adresse", "Type", "Pris", "Areal", "Anslået leje", "Faste udgifter", "Cash flow pr. md.", ""].map((t) => <th key={t} className="px-3 py-2 font-medium">{t}</th>)}</tr></thead>
                  <tbody>
                    {homes.map((h) => (
                      <tr key={h.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-medium">{h.road || h.address}<span className="block font-normal text-slate-500">{h.zip} {h.city}</span></td>
                        <td className="px-3 py-2">{TYPE[h.type] ?? h.type}</td>
                        <td className="px-3 py-2">{kr(h.price)}</td>
                        <td className="px-3 py-2">{h.area ? `${h.area} m²` : "–"}</td>
                        <td className="px-3 py-2">{kr(h.estRent)}</td>
                        <td className="px-3 py-2">{kr(opex(h))}</td>
                        <td className={`px-3 py-2 font-semibold ${h.cashFlow >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{signed(h.cashFlow)}</td>
                        <td className="px-3 py-2">{h.url ? <a href={h.url} target="_blank" rel="noopener" className="text-blue-700 hover:underline">Annoncen</a> : null}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
        ))}

        <section className="mt-12 rounded-2xl bg-white p-6 ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold">Sådan er tallene regnet</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] text-slate-600">
            <li>Alle ejerlejligheder, villaer og rækkehuse til salg. Fritidshuse og andelsboliger er ikke med, og boliger med tal, der ikke kan passe, er sorteret fra.</li>
            <li>20 % udbetaling og 5 % rente på lånet.</li>
            <li>Anslået markedsleje ud fra postnummer og boligens størrelse.</li>
            <li>Faste udgifter: ejerudgiften fra annoncen, ellers et skøn på 35 kr. pr. m² om måneden.</li>
            <li>Giver plus: lejen dækker lån og alle faste udgifter. Tallene ændrer sig, når boliger kommer til eller bliver solgt.</li>
          </ul>
          <p className="mt-4 text-[15px] text-slate-600">Tallene må bruges med NordInvest som kilde. <a href={xlsx} className="font-semibold text-blue-700 hover:underline">Hent alle tal som regneark</a>. Spørgsmål: Nikolaj Blond, 20 99 37 97, contact@nordinvest.io.</p>
        </section>
      </main>
      <Footer />
    </div>
  );
}

/* eslint-disable @next/next/no-img-element -- listing photos come from the portal's image server */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readInvestmentDeals, readInvestmentListing } from "@/lib/portals/marketdb";

/*
 * /demo/annonce: for meetings with listing portals. A plain investment listing
 * page (no portal's branding) with NordInvest's box embedded exactly as the
 * portal would embed it, one iframe. ?id=<listing id> shows a given listing;
 * otherwise a typical let residential building with complete figures.
 * Not linked anywhere and not indexed.
 */

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false }, title: "Demo: NordInvest på en investeringsannonce" };

const dk = (n: number) => Math.round(n).toLocaleString("da-DK");

export default async function DemoListing({ searchParams }: { searchParams: { id?: string } }) {
  const l = searchParams.id
    ? await readInvestmentListing(searchParams.id)
    : (await readInvestmentDeals({ limit: 600 }))?.find((x) => x.subcategory === "Boligudlejning" && x.image && x.operatingCost && x.area && x.returnPercent && x.returnPercent >= 4.5 && x.returnPercent <= 7 && x.price >= 4e6 && x.price <= 30e6) ?? null;
  if (!l || !l.returnPercent) notFound();
  const embed = `/embed/analyse/${encodeURIComponent(l.id)}?kilde=demo`;
  const facts: [string, string][] = [
    ["Kontantpris", `${dk(l.price)} kr`],
    ["Afkast", `${l.returnPercent.toLocaleString("da-DK", { maximumFractionDigits: 1 })} %`],
    ["Areal", l.area ? `${dk(l.area)} m²` : "–"],
    ["Driftsudgifter", l.operatingCost ? `${dk(l.operatingCost)} kr/år` : "–"],
    ["Type", l.subcategory ?? "Investering"],
    ["Energimærke", l.energyLabel ?? "–"],
  ];

  return (
    <div className="min-h-[100dvh] bg-[#f4f5f7] text-slate-900">
      <div className="bg-slate-900 px-4 py-2.5 text-center text-[13px] font-medium text-white">
        Demo: sådan kan NordInvests beregning sidde på en investeringsannonce. Boksen til højre er én linje kode på annoncen.
      </div>
      <main className="mx-auto max-w-[1120px] px-4 py-6 sm:px-6 sm:py-10">
        <p className="text-[13px] font-medium text-slate-500">{l.subcategory ?? "Investeringsejendom"} · {l.zip} {l.city}</p>
        <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.02em] sm:text-[32px]">{l.road || l.address}</h1>
        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0">
            {l.image && <img src={l.image} alt={`${l.address}, facade`} className="aspect-[16/10] w-full rounded-2xl object-cover" />}
            <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-slate-200 ring-1 ring-slate-200 sm:grid-cols-3">
              {facts.map(([k, v]) => (
                <div key={k} className="bg-white px-4 py-3"><dt className="text-[12px] text-slate-500">{k}</dt><dd className="mt-0.5 text-[16px] font-semibold tabular-nums">{v}</dd></div>
              ))}
            </dl>
            <p className="mt-4 text-[14px] leading-relaxed text-slate-600">Annoncens beskrivelse, salgsopstilling og mæglerens kontaktoplysninger står her på portalens egen side, som de gør i dag.</p>
            {l.url && <a href={l.url} target="_blank" rel="noopener" className="mt-3 inline-block text-[14px] font-semibold text-blue-700 hover:underline">Se den rigtige annonce</a>}
          </div>
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <iframe src={embed} title="NordInvest: Hvad giver ejendommen?" className="h-[372px] w-full rounded-2xl border-0" loading="lazy" />
            <p className="mt-2 px-1 font-mono text-[11px] leading-relaxed text-slate-500 break-all">{`<iframe src="https://nordinvest.io${embed.replace("kilde=demo", "kilde=portal")}" height="372"></iframe>`}</p>
          </aside>
        </div>
      </main>
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readInvestmentListing } from "@/lib/portals/marketdb";
import { getMarketRates } from "@/lib/market-rates";
import { TeaserBox } from "@/components/embed/TeaserBox";

/*
 * /embed/analyse/<id>: NordInvest's box for an investment listing, made to sit
 * in an iframe on the portal's listing page. Only the headline numbers; the
 * button opens the full analysis on NordInvest. ?kilde=<portal> tags the traffic.
 */

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false }, title: "NordInvest · Hvad giver ejendommen?" };

export default async function EmbedAnalysis({ params, searchParams }: { params: { id: string }; searchParams: Record<string, string | undefined> }) {
  const id = decodeURIComponent(params.id);
  const [l, rates] = await Promise.all([readInvestmentListing(id), getMarketRates().catch(() => null)]);
  if (!l || !l.price || !l.returnPercent) notFound();
  const rate = rates ? Math.round(rates.company.fixed * 10) / 10 : 5;
  const kilde = encodeURIComponent(searchParams.kilde ?? "annonce");
  const fullHref = `https://nordinvest.io/adgang?ejendom=${encodeURIComponent(l.id)}&utm_source=${kilde}&utm_medium=embed&utm_campaign=annonce-analyse`;
  return (
    <div className="h-[100dvh] bg-transparent p-1">
      <TeaserBox listing={{ id: l.id, price: l.price, returnPercent: l.returnPercent, operatingCost: l.operatingCost, area: l.area, subcategory: l.subcategory }}
        rate={rate} rateLabel={rates ? `Nationalbankens fastforrentede rente for virksomheder, ${rates.label}` : null} fullHref={fullHref} />
    </div>
  );
}

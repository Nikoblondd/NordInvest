import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getLink, recordView } from "@/lib/broker/links";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { SharedAnalysis } from "@/components/shared/SharedAnalysis";
import { getMarketRates } from "@/lib/market-rates";

/*
 * Short, readable links to the analysis of one listing, for the brokers we
 * share it with: nordinvest.io/e/helligkorsgade-17-kolding. The page is open
 * to anyone with the link (no login), so a broker and their buyers can read it
 * and change the down payment and rate themselves. The numbers are the
 * listing's own (price, the seller's stated yield as net rent), scored the same
 * way as the Deal-motor card. Links come from the outreach file or from agents
 * themselves (/maegler); each visit is counted for the agent's dashboard.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const l = await getLink(params.slug);
  if (!l) return { robots: { index: false } };
  const street = l.addr.split(",")[0];
  const q = new URLSearchParams({ addr: l.addr, price: String(l.price), rent: String(l.rent), opex: "0", downPaymentPct: "40", interestRate: "5" });
  return {
    title: { absolute: `Analyse af ${street} · NordInvest` },
    description: `Investeringsanalyse af ${l.addr}: overskud efter lånet, afkast, rentestress og 10 år frem.`,
    robots: { index: false, follow: false },
    openGraph: {
      title: `Analyse af ${street} · NordInvest`,
      description: "Overskud efter lånet, afkast, rentestress og 10 år frem, regnet igennem på NordInvest.",
      images: [{ url: `/api/og/analyse?${q.toString()}`, width: 1200, height: 630, alt: `Analyse af ${street}` }],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function SharedAnalysisPage({ params }: { params: { slug: string } }) {
  const [l, rates] = await Promise.all([getLink(params.slug), getMarketRates()]);
  if (!l) redirect("/deals");
  const ua = headers().get("user-agent") ?? "";
  // Link previews and crawlers are not visitors.
  if (!/bot|crawl|spider|preview|facebookexternalhit|slack|whatsapp|telegram|linkedin|headless/i.test(ua)) await recordView(params.slug);
  console.log(`[maegler-link] ${params.slug} ${ua.slice(0, 80)}`);
  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-[#f6f4ef] text-slate-900">
      <Nav />
      <SharedAnalysis rates={rates} listing={{ slug: l.slug, url: l.url, price: l.price, rent: l.rent, subcat: l.subcat, addr: l.addr, imgs: l.imgs, direct: !!(l.ownerId || l.contact), opex: l.opex ?? null, area: l.area ?? null, areaSource: l.areaSource, builtYear: l.builtYear ?? null, renovatedYear: l.renovatedYear ?? null, dossier: l.dossier ?? null }} />
      <Footer />
    </div>
  );
}

import { NextResponse } from "next/server";
import links from "@/data/maegler-links.json";

/*
 * Short, readable links to the analysis of one listing, for the brokers we
 * share it with: nordinvest.io/e/helligkorsgade-17-kolding. The slug maps to
 * the listing's own numbers (price, the seller's stated yield as net rent),
 * scored the same way as the Deal-motor card. Each visit is logged so we can
 * see which broker opened their link.
 */

type Link = { url: string; price: number; rent: number; subcat: string | null; addr: string };
const LINKS = links as Record<string, Link>;

export function GET(req: Request, { params }: { params: { slug: string } }) {
  const l = LINKS[params.slug];
  if (!l) return NextResponse.redirect(new URL("/deals", req.url), 307);
  const q = new URLSearchParams({
    url: l.url,
    price: String(l.price),
    rent: String(l.rent),
    opex: "0",
    downPaymentPct: "30",
    interestRate: "5",
    market: "investering",
    addr: l.addr,
    utm_source: "maegler",
    utm_campaign: params.slug,
  });
  if (l.subcat) q.set("subcat", l.subcat);
  console.log(`[maegler-link] ${params.slug} ${req.headers.get("user-agent")?.slice(0, 80) ?? ""}`);
  return NextResponse.redirect(new URL(`/analyseren?${q.toString()}`, req.url), 307);
}

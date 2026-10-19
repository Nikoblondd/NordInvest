import type { AnalyzedDeal, InvestmentDeal } from "@/lib/deals";

// Links from a scored deal into the analyzer. Shared by the Deal-motor (client)
// and the server-rendered top lists, so a card and its full analysis always
// show the same numbers.

// Carry the reliable Boligsiden numbers straight into the analyzer, and pass the
// agent URL so it can still fetch photos for the AI condition analysis. This
// avoids depending on each agent's page structure for the core figures.
export function dealHref(d: AnalyzedDeal, dp: string, ir: string): string {
  const q = new URLSearchParams();
  q.set("url", d.url);
  q.set("price", String(d.price));
  if (d.area) q.set("area", String(d.area));
  if (d.rooms) q.set("rooms", String(d.rooms));
  // Pass the EXACT operating cost the card was scored with — when the listing
  // has no ejerudgift, analyzeDeal estimates it from the area. Omitting it made
  // the analyzer fall back to its generic default, so cash flow and score
  // dropped on click-through. Must mirror analyzeDeal()'s formula exactly.
  const opex = d.monthlyExpense ?? (d.area ? Math.round((d.area * 35) / 50) * 50 : 0);
  q.set("opex", String(opex));
  q.set("rent", String(d.estRent));
  // Carry the SAME financing assumptions the card was scored with, so the full
  // analysis reproduces the exact cash flow / score — no jump on click-through.
  q.set("downPaymentPct", dp);
  q.set("interestRate", ir);
  if (d.address) q.set("addr", d.address);
  if (d.yearBuilt) q.set("year", String(d.yearBuilt));
  return `/analyseren?${q.toString()}`;
}

export function investHref(d: InvestmentDeal, dp: string, ir: string): string {
  const q = new URLSearchParams();
  q.set("url", d.url);
  q.set("price", String(d.price));
  if (d.area) q.set("area", String(d.area));
  q.set("rent", String(Math.round(d.noi / 12))); // NOI/md as the (net) rent baseline
  q.set("opex", "0"); // NOI is already net — don't double-count operating costs
  // The seller's stated operating costs, so the analysis can show rent and costs separately.
  if (d.operatingCost && d.operatingCost > 0) q.set("sellerOpex", String(Math.round(d.operatingCost)));
  // Same financing assumptions the card was scored with (investment defaults to
  // 30 % down) so the full analysis matches the card exactly.
  q.set("downPaymentPct", dp);
  q.set("interestRate", ir);
  q.set("market", "investering");
  if (d.subcategory) q.set("subcat", d.subcategory);
  if (d.address) q.set("addr", d.address);
  return `/analyseren?${q.toString()}`;
}

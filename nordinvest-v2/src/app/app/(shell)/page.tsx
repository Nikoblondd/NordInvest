import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Overview, type Opportunity } from "@/components/app/Overview";
import { appUser, properties } from "@/lib/app/data";
import { getDealSnapshot } from "@/lib/deals-snapshot";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Overblik" };

/** Deal links point at the public analyser; inside the app they open the member analyser. */
const inApp = (href: string) => href.replace(/^\/analyseren/, "/app/analyser");

export default async function OverviewPage() {
  const me = await appUser();
  if (!me) redirect("/auth/login?next=/app");
  const [rows, snap] = await Promise.all([properties(me.user.id), getDealSnapshot(null, 4).catch(() => null)]);
  const deals: Opportunity[] = (snap?.top ?? []).slice(0, 4).map((d) => ({
    address: d.address, zip: d.zip, city: d.city, price: d.price, cashFlow: d.cashFlow, capRate: d.capRate, image: d.image, href: inApp(d.href),
  }));
  return <Overview firstName={me.firstName} initial={rows} deals={deals} positive={snap?.positive ?? null} />;
}

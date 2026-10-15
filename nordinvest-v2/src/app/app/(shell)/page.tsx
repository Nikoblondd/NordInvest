import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Overview, type Opportunity } from "@/components/app/Overview";
import { appUser, properties } from "@/lib/app/data";
import { readStore } from "@/lib/app/store";
import { getDealSnapshot } from "@/lib/deals-snapshot";
import type { CalEvent } from "@/lib/app/events";
import { tidyAgent, type Agent } from "@/lib/app/agents";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Overblik" };

/** Deal links point at the public analyser; inside the app they open the member analyser. */
const inApp = (href: string) => href.replace(/^\/analyseren/, "/app/analyser");

export default async function OverviewPage() {
  const me = await appUser();
  if (!me) redirect("/auth/login?next=/app");
  const [rows, events, agents, snap] = await Promise.all([
    properties(me.user.id),
    readStore<CalEvent>("events", me.user.id),
    readStore<Agent>("agents", me.user.id).then((l) => l.map(tidyAgent)),
    getDealSnapshot(null, 4).catch(() => null),
  ]);
  const deals: Opportunity[] = (snap?.top ?? []).slice(0, 4).map((d) => ({
    address: d.address, zip: d.zip, city: d.city, price: d.price, cashFlow: d.cashFlow, capRate: d.capRate, image: d.image, href: inApp(d.href),
  }));
  // Only what the overview shows: the agents' unseen listings, not their full history.
  const slim = agents.map((a) => ({ ...a, seen: [], runs: a.runs.slice(0, 1), hits: a.hits.filter((h) => h.status === "ny").slice(0, 20) }));
  return <Overview firstName={me.firstName} initial={rows} events={events} agents={slim} deals={deals} />;
}

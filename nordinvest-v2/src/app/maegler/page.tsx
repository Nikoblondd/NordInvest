import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { BrokerDashboard } from "@/components/broker/BrokerDashboard";
import { BrokerWelcome } from "@/components/broker/BrokerWelcome";
import { brokerUser } from "@/lib/broker/gate";
import { legacyLinks, listLinks, viewCount } from "@/lib/broker/links";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mæglerværktøj" };

export default async function BrokerPage() {
  const me = await brokerUser();
  if (!me) redirect("/auth/login?next=/maegler");
  const meta = (me.user.user_metadata ?? {}) as Record<string, unknown>;
  const name = String(meta.full_name ?? "");
  // A new agent sets a name and a password once, then lands on the tools.
  if (!me.admin && !meta.broker_ready) return <BrokerWelcome email={me.user.email ?? ""} initialName={name} />;

  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "nordinvest.io";
  const origin = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? `http://${host}` : /nordinvest\.io$/.test(host) ? "https://nordinvest.io" : `https://${host}`;
  const withViews = async <T extends { slug: string }>(ls: T[]) => Promise.all(ls.map(async (l) => ({ ...l, views: await viewCount(l.slug) })));
  const [links, legacy] = await Promise.all([withViews(await listLinks(me.user.id)), me.admin ? withViews(legacyLinks()) : Promise.resolve([])]);
  return <BrokerDashboard origin={origin} initial={links} legacy={legacy} admin={me.admin} firstName={name.split(" ")[0] ?? ""} />;
}

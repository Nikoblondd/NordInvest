import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AgentDetail } from "@/components/app/agents/Agents";
import { appUser } from "@/lib/app/data";
import { readStore } from "@/lib/app/store";
import { tidyAgent, type Agent } from "@/lib/app/agents";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Søgeagent" };

export default async function AgentPage({ params }: { params: { id: string } }) {
  const me = await appUser();
  if (!me) redirect(`/auth/login?next=/app/find/agenter/${encodeURIComponent(params.id)}`);
  const agent = (await readStore<Agent>("agents", me.user.id).then((l) => l.map(tidyAgent))).find((a) => a.id === params.id);
  if (!agent) notFound();
  return <AgentDetail initial={agent} />;
}

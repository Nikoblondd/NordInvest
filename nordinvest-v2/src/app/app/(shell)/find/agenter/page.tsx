import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { FindTabs } from "@/components/app/FindTabs";
import { AgentsHome } from "@/components/app/agents/Agents";
import type { AgentInput } from "@/components/app/agents/AgentEditor";
import { appUser } from "@/lib/app/data";
import { readStore } from "@/lib/app/store";
import { cleanCriteria, type Agent } from "@/lib/app/agents";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Søgeagenter" };

export default async function AgentsPage({ searchParams }: { searchParams: { ny?: string } }) {
  const me = await appUser();
  if (!me) redirect("/auth/login?next=/app/find/agenter");
  const agents = await readStore<Agent>("agents", me.user.id);
  const fresh = agents.reduce((n, a) => n + a.hits.filter((h) => h.status === "ny").length, 0);
  // "Gem som søgeagent" from the Deal-motor opens the form with its filters.
  let prefill: Partial<AgentInput> | null = null;
  if (searchParams.ny) {
    try { prefill = { criteria: cleanCriteria(JSON.parse(searchParams.ny)) }; } catch { prefill = {}; }
  }
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader title="Find boliger" sub="Deal-motoren beregner hele markedet hver 6. time. Søg selv, eller opret en søgeagent." />
      <FindTabs active="agenter" fresh={fresh} />
      <AgentsHome initial={agents} prefill={prefill} />
    </div>
  );
}

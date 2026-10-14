import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { DealFinder } from "@/components/deals/DealFinder";
import { PageHeader } from "@/components/app/PageHeader";
import { FindTabs } from "@/components/app/FindTabs";
import { appUser } from "@/lib/app/data";
import { readStore } from "@/lib/app/store";
import type { Agent } from "@/lib/app/agents";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Find boliger" };

export default async function FindPage() {
  const me = await appUser();
  if (!me) redirect("/auth/login?next=/app/find");
  const agents = await readStore<Agent>("agents", me.user.id);
  const fresh = agents.reduce((n, a) => n + a.hits.filter((h) => h.status === "ny").length, 0);
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader title="Find boliger" sub="Deal-motoren beregner hele markedet hver 6. time. Søg selv, eller opret en søgeagent." />
      <FindTabs active="soeg" fresh={fresh} />
      <div className="mt-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-white" />}>
          <DealFinder />
        </Suspense>
      </div>
    </div>
  );
}

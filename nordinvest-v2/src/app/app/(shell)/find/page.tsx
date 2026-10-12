import type { Metadata } from "next";
import { Suspense } from "react";
import { DealFinder } from "@/components/deals/DealFinder";
import { PageHeader } from "@/components/app/PageHeader";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Find boliger" };

export default function FindPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader title="Find boliger" sub="Deal-motoren regner hele markedet igennem hver 6. time. Filtrér, se kortet, og analysér med ét tryk." />
      <div className="mt-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-white" />}>
          <DealFinder />
        </Suspense>
      </div>
    </div>
  );
}

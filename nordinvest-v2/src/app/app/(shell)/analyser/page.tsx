import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Suspense } from "react";
import { AnalyzerApp } from "@/components/analyzer/AnalyzerApp";
import { JourneyFlow } from "@/components/journey/Journey";
import { AnalyseStart } from "@/components/app/AnalyseStart";
import { PageHeader } from "@/components/app/PageHeader";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Analysér" };

// The analyser components ask for font-display/font-sans; here both are Geist.
const geistScope = { "--font-display": "var(--font-geist)", "--font-inter": "var(--font-geist)" } as CSSProperties;

export default function AnalysePage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const one = (k: string) => (typeof searchParams[k] === "string" ? (searchParams[k] as string) : "");
  // A link with "choose a strategy": the plan questions first.
  if (one("strategi") && one("url")) {
    return <div style={geistScope} className="font-geist"><JourneyFlow initialUrl={one("url")} variant="page" /></div>;
  }
  const analyzing = !!(one("url") || one("price") || one("saved"));
  return (
    <div style={geistScope} className="font-geist">
      {!analyzing && (
        <div className="mx-auto max-w-[1080px] px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8">
          <PageHeader title="Analysér" sub="Overskud, afkast, renterisiko og 10 år frem på et minut. Gem boligen, så lander den i din pipeline med tallene." />
          <div className="mt-6"><AnalyseStart /></div>
          <h2 className="mt-10 text-[18px] font-semibold">Eller regn selv</h2>
          <p className="mt-1 text-[15px] text-slate-500">Skriv pris, leje og udgifter, så ser du resultatet med det samme.</p>
        </div>
      )}
      <Suspense fallback={<div className="mx-auto mt-6 h-96 max-w-[1080px] animate-pulse rounded-2xl bg-white" />}>
        <AnalyzerApp />
      </Suspense>
    </div>
  );
}

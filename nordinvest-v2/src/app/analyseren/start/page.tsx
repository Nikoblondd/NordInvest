import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { Journey } from "@/components/journey/Journey";
import { geist } from "@/components/home/fonts";
import { toolUser } from "@/lib/gate";
import { LockedTool } from "@/components/gate/LockedTool";
import { Footer as LockedFooter } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Analysér en bolig: vælg din strategi",
  description: "Vælg om du vil leje ud, flippe eller bo og flippe, og få en analyse bygget til din plan. En del af NordInvest, med adgang efter en kort samtale.",
  alternates: { canonical: "/analyseren/start" },
};

const geistScope = { "--font-display": "var(--font-geist)", "--font-inter": "var(--font-geist)" } as CSSProperties;

export const dynamic = "force-dynamic";

export default async function StartPage() {
  if (!(await toolUser())) {
    return (
      <div className="min-h-[100dvh] overflow-x-clip bg-white text-slate-900">
        <Nav />
        <main className={`${geist.variable} font-geist antialiased`} style={geistScope}>
          <LockedTool title="Vælg din strategi, og få en analyse bygget til den." lead="Udlejning, renovering og salg eller bo og flip: NordInvest regner boligen igennem efter din plan. Analysen er en del af NordInvest, som du får adgang til efter en kort samtale." />
        </main>
        <LockedFooter />
      </div>
    );
  }
  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-white text-slate-900">
      <Nav />
      <main className={`${geist.variable} font-geist antialiased`} style={geistScope}>
        <Suspense>
          <Journey />
        </Suspense>
      </main>
    </div>
  );
}

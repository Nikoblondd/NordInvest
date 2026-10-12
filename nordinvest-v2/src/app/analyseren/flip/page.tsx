import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { FlipReport } from "@/components/flip/FlipReport";
import { geist } from "@/components/home/fonts";
import { toolUser } from "@/lib/gate";
import { LockedTool } from "@/components/gate/LockedTool";
import { Footer as LockedFooter } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Flip-analyse: hvad tjener du efter skat?",
  description: "Værdi efter renovering fra rigtige salgsannoncer, renoveringsbudget med priser fra byggemarkederne, alle omkostninger, skat og dit maksimale bud.",
  robots: { index: false },
};

const geistScope = { "--font-display": "var(--font-geist)", "--font-inter": "var(--font-geist)" } as CSSProperties;

export const dynamic = "force-dynamic";

export default async function FlipPage() {
  if (!(await toolUser())) {
    return (
      <div className="min-h-[100dvh] overflow-x-clip bg-white text-slate-900">
        <Nav />
        <main className={`${geist.variable} font-geist antialiased`} style={geistScope}>
          <LockedTool title="Hvad tjener du på en renovering efter skat?" lead="Værdi efter renovering, budget med rigtige materialepriser, alle omkostninger og dit højeste bud. Flip-analysen er en del af NordInvest, som du får adgang til efter en kort samtale." />
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
          <FlipReport />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

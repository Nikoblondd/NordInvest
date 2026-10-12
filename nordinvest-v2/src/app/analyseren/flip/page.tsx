import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { geist } from "@/components/home/fonts";
import { toolUser } from "@/lib/gate";
import { LockedTool } from "@/components/gate/LockedTool";
import { qs } from "@/lib/app/qs";

export const metadata: Metadata = {
  title: "Flip-analyse: hvad tjener du efter skat?",
  description: "Værdi efter renovering fra rigtige salgsannoncer, renoveringsbudget med priser fra byggemarkederne, alle omkostninger, skat og dit maksimale bud.",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

const geistScope = { "--font-display": "var(--font-geist)", "--font-inter": "var(--font-geist)" } as CSSProperties;

export default async function FlipPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  // Members work inside the app.
  if (await toolUser()) redirect(`/app/analyser/flip${qs(searchParams)}`);
  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-white text-slate-900">
      <Nav />
      <main className={`${geist.variable} font-geist antialiased`} style={geistScope}>
        <LockedTool title="Hvad tjener du på en renovering efter skat?" lead="Værdi efter renovering, budget med rigtige materialepriser, alle omkostninger og dit højeste bud. Flip-analysen er en del af NordInvest, som du får adgang til efter en kort samtale." />
      </main>
      <Footer />
    </div>
  );
}

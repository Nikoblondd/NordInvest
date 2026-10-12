import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { geist } from "@/components/home/fonts";
import { toolUser } from "@/lib/gate";
import { LockedTool } from "@/components/gate/LockedTool";

export const metadata: Metadata = {
  title: "Analysér en bolig: vælg din strategi",
  description: "Vælg om du vil leje ud, flippe eller bo og flippe, og få en analyse bygget til din plan. En del af NordInvest, med adgang efter en kort samtale.",
  alternates: { canonical: "/analyseren/start" },
};
export const dynamic = "force-dynamic";

const geistScope = { "--font-display": "var(--font-geist)", "--font-inter": "var(--font-geist)" } as CSSProperties;

export default async function StartPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  // Members work inside the app.
  if (await toolUser()) {
    const url = typeof searchParams.url === "string" ? searchParams.url : "";
    redirect(url ? `/app/analyser?strategi=1&url=${encodeURIComponent(url)}` : "/app/analyser");
  }
  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-white text-slate-900">
      <Nav />
      <main className={`${geist.variable} font-geist antialiased`} style={geistScope}>
        <LockedTool title="Vælg din strategi, og få en analyse bygget til den." lead="Udlejning, renovering og salg eller bo og flip: NordInvest regner boligen igennem efter din plan. Analysen er en del af NordInvest, som du får adgang til efter en kort samtale." />
      </main>
      <Footer />
    </div>
  );
}

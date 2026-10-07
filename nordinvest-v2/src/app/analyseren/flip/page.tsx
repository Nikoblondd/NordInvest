import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { FlipReport } from "@/components/flip/FlipReport";
import { geist } from "@/components/home/fonts";

export const metadata: Metadata = {
  title: "Flip-analyse: hvad tjener du efter skat?",
  description: "Værdi efter renovering fra rigtige salgsannoncer, renoveringsbudget med priser fra byggemarkederne, alle omkostninger, skat og dit maksimale bud.",
  robots: { index: false },
};

const geistScope = { "--font-display": "var(--font-geist)", "--font-inter": "var(--font-geist)" } as CSSProperties;

export default function FlipPage() {
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

import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { Journey } from "@/components/journey/Journey";
import { geist } from "@/components/home/fonts";

export const metadata: Metadata = {
  title: "Analysér en bolig: vælg din strategi",
  description: "Indsæt et boliglink, vælg om du vil leje ud, flippe eller bo og flippe, og få en analyse bygget til din plan.",
  alternates: { canonical: "/analyseren/start" },
};

const geistScope = { "--font-display": "var(--font-geist)", "--font-inter": "var(--font-geist)" } as CSSProperties;

export default function StartPage() {
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

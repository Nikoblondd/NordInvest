import type { Metadata } from "next";
import Image from "next/image";
import { Check, Phone } from "lucide-react";
import { Footer } from "@/components/Footer";
import { geist } from "@/components/home/fonts";
import { LandingNav } from "@/components/landing/LandingNav";
import { AccessForm } from "@/components/landing/AccessForm";
import { site } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/access";

export const metadata: Metadata = {
  title: "Anmod om adgang",
  description: "Anmod om adgang til NordInvest. Vi tager en samtale på 20 minutter om, hvordan du investerer, og hvad du har brug for, og aftaler derefter pris og adgang.",
  alternates: { canonical: "/adgang" },
};

export default async function AdgangPage({ searchParams }: { searchParams: { kilde?: string } }) {
  // A logged-in account without tool access lands here: say so plainly.
  const supabase = createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const waiting = !!user && !isAdmin(user);
  return (
    <div className={`${geist.variable} min-h-screen bg-white font-[family-name:var(--font-geist)] text-slate-900 antialiased`}>
      <LandingNav />
      <main className="relative overflow-hidden" style={{ background: "radial-gradient(1100px 600px at 10% 0%, #1a3a6b 0%, #0b1b33 60%)" }}>
        <div className="mx-auto grid max-w-[1320px] gap-12 px-4 py-12 text-white sm:px-8 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="lg:pt-6">
            {waiting && (
              <div role="status" className="mb-8 rounded-xl bg-white/[0.08] px-4 py-3 text-[15px] leading-relaxed text-white/85 ring-1 ring-white/15">
                Du er logget ind som <b className="text-white">{user!.email}</b>, men din konto har ikke adgang til NordInvest endnu. Send en anmodning herunder, så kontakter jeg dig.
              </div>
            )}
            <h1 className="text-[36px] font-semibold leading-[1.05] tracking-[-0.035em] [text-wrap:balance] sm:text-[52px]">
              Fortæl mig, <span className="text-blue-400">hvad du har brug for.</span>
            </h1>
            <p className="mt-5 max-w-[32rem] text-[18px] leading-relaxed text-white/65">Svar på et par korte spørgsmål. Så ringer jeg dig op, og vi finder ud af, om NordInvest kan hjælpe dig.</p>
            <ol className="mt-10 space-y-6">
              {[["Du sender anmodningen", "Det tager 2 minutter."], ["Vi tager en samtale på 20 minutter", "Jeg ringer inden for en arbejdsdag. Vi taler om, hvordan du investerer i dag, og hvad du har brug for."], ["Du får et ærligt svar", "Passer NordInvest til dig, aftaler vi pris, og du får en personlig invitation. Ellers siger jeg det."]].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[14px] font-semibold">{i + 1}</span>
                  <span><span className="block text-[17px] font-semibold">{t}</span><span className="mt-0.5 block max-w-md text-[15px] leading-relaxed text-white/60">{d}</span></span>
                </li>
              ))}
            </ol>
            <ul className="mt-10 space-y-2.5 text-[15px] text-white/80">
              {["Ingen binding", "Ingen betaling, før vi har talt sammen", "Dine oplysninger bruges kun til at kontakte dig"].map((t) => <li key={t} className="flex items-center gap-2.5"><Check size={17} className="text-emerald-400" />{t}</li>)}
            </ul>
            <div className="mt-10 flex max-w-md items-center gap-4 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
              <Image src="/founder.jpg" alt="Nikolaj Blond" width={56} height={56} className="h-14 w-14 shrink-0 rounded-xl object-cover" priority />
              <div className="min-w-0">
                <p className="text-[15px] font-semibold">Nikolaj Blond, stifter</p>
                <a href={site.phoneHref} className="inline-flex min-h-[40px] items-center gap-1.5 text-[15px] text-blue-300 hover:text-blue-200"><Phone size={14} /> {site.phone}</a>
              </div>
            </div>
          </div>
          <div><AccessForm source={searchParams.kilde ? String(searchParams.kilde).slice(0, 40) : "adgang"} /></div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

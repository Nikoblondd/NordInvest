import { CheckCircle2 } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { HeroInput } from "@/components/home/HeroInput";
import { Timeline } from "@/components/home/Timeline";
import { PricingCards } from "@/components/PricingCards";

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <Nav />

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-6 pb-32 pt-24 text-center">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/50 via-slate-50 to-slate-50" />

        <div className="mx-auto flex max-w-4xl flex-col items-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200/50 bg-blue-100/50 px-3 py-1.5 text-sm font-medium text-blue-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600" />
            </span>
            Danmarks hurtigste ejendomsanalyse
          </div>

          <h1 className="mb-6 text-5xl font-bold leading-[1.1] tracking-tight text-slate-900 md:text-7xl">
            Analyser ejendomsinvesteringer på{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              under 60 sekunder
            </span>
          </h1>

          <p className="mb-10 max-w-2xl text-lg leading-relaxed text-slate-600 md:text-xl">
            Indsæt et link fra en dansk boligside. Få beregnet cashflow, afkast,
            rentestress-test og en klar dom. Slut med at bruge timer i tunge Excel-ark
            for én ejendom.
          </p>

          <HeroInput />

          <p className="mt-6 flex items-center gap-2 text-sm text-slate-500">
            <CheckCircle2 size={16} className="text-emerald-500" />
            3 gratis analyser om måneden — kræver intet kreditkort
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="hvordan" className="overflow-hidden bg-white px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-20 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-slate-900">
              Sådan foregår en NordInvest analyse
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-600">
              Følg rejsen fra et simpelt boliglink til en komplet og professionel
              investeringsdom på sekunder.
            </p>
          </div>
          <Timeline />
        </div>
      </section>

      {/* Pricing */}
      <section id="priser" className="bg-slate-50 px-6 py-24">
        <div className="mx-auto flex max-w-7xl flex-col items-center">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-slate-900">
              Gennemsigtige priser for seriøse investorer
            </h2>
            <p className="mx-auto max-w-xl text-lg text-slate-600">
              Vælg den pakke, der passer til dit investeringsniveau.
            </p>
          </div>
          <PricingCards />
        </div>
      </section>

      <Footer />
    </div>
  );
}

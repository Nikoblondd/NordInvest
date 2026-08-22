import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "For Investors",
  description:
    "NordInvest is building the analyst layer for Nordic real estate — data-driven property analysis for Danish investors.",
};

const metrics = [
  { k: "Market", v: "Denmark first", sub: "Nordic PropTech, €-billions in annual residential transaction volume" },
  { k: "Model", v: "Freemium → subscription", sub: "129 / 349 / 799 DKK per month tiers" },
  { k: "Stage", v: "Solo founder", sub: "Building in public, pre-seed" },
];

export default function ForInvestorsPage() {
  return (
    <main>
      <Nav theme="dark" />

      <section className="grain bg-navy-900 pt-32 text-cream-100">
        <div className="container-x pb-24">
          <p className="micro text-gold-400">For Investors</p>
          <h1 className="mt-6 max-w-4xl text-4xl md:text-6xl">
            NordInvest is building the{" "}
            <span className="italic text-gold-400">analyst layer</span> for Nordic
            real estate.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-cream-100/70">
            We turn any Danish property listing into an institutional-grade
            investment verdict in under 60 seconds — yield, cash flow, rate-stress,
            and a five-year outlook. The tools professionals charge thousands for,
            available to every investor.
          </p>
        </div>
      </section>

      <section className="bg-cream-50 py-20">
        <div className="container-x">
          <div className="grid gap-6 md:grid-cols-3">
            {metrics.map((m) => (
              <div key={m.k} className="rounded-2xl border border-stone-200 bg-white p-8">
                <div className="micro text-gold-600">{m.k}</div>
                <div className="mt-3 font-serif text-2xl text-stone-900">{m.v}</div>
                <p className="mt-2 text-sm text-stone-500">{m.sub}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 grid gap-12 md:grid-cols-2">
            <div>
              <h2 className="text-2xl md:text-3xl">The opportunity</h2>
              <p className="mt-4 text-stone-600">
                Danish residential investing is large, fragmented, and still run on
                spreadsheets. Existing analysis is either free-and-shallow (broker
                headline yields) or expensive-and-slow (advisory reports at
                5,000–15,000 DKK each). NordInvest sits in the gap: instant,
                trustworthy, and priced for repeat use.
              </p>
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl">The ask</h2>
              <p className="mt-4 text-stone-600">
                We are raising a pre-seed round to accelerate data coverage,
                automated listing ingestion, and distribution. If you invest in
                Nordic PropTech or founder-led SaaS, we would like to talk.
              </p>
              <Button href="/kontakt" className="mt-6">
                Get in touch →
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

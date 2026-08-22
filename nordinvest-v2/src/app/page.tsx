import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { DashboardMockup } from "@/components/DashboardMockup";
import { PricingCards } from "@/components/PricingCards";

const problems = [
  {
    n: "01",
    title: "Excel-arket der aldrig blev færdigt",
    body: "Du åbner det samme regneark hver gang. Retter formler. Kigger på DST-data. To timer senere ved du stadig ikke om det er en god handel.",
  },
  {
    n: "02",
    title: "Mæglerens tal fortæller ikke sandheden",
    body: "Bruttoafkast på salgsopstillingen tager ikke højde for tomgang, vedligehold eller rentestigning. Du regner det om selv — hver gang.",
  },
  {
    n: "03",
    title: "Rådgiveren koster mere end handlen",
    body: "Professionel ejendomsanalyse koster 5–15.000 kr per rapport. For en almindelig investor er det ikke en mulighed på hver deal.",
  },
];

const agents = [
  { n: "01", title: "Cashflow-analyse", body: "Månedlig indtægt minus alle udgifter. Ved du reelt hvad ejendommen putter i lommen?" },
  { n: "02", title: "Afkast-beregning", body: "Brutto, netto, kontant. Alle tre — så du kan sammenligne handler ærligt." },
  { n: "03", title: "Rentestress-test", body: "Overlever handlen +2 procentpoints rentestigning? Hvis nej, ved du det inden du byder." },
  { n: "04", title: "5-årig prisprognose", body: "Baseret på DST EJ55-data for postnummeret. Ingen gætværk." },
  { n: "05", title: "Renoveringsanalyse (BRRRR)", body: "Hvad hvis du renoverer for 250.000? Se afkast-uplift sort på hvidt." },
  { n: "06", title: "Lokal markedsdata", body: "Sammenlignelige lejer i området. Hvad kan du realistisk kræve?" },
];

const steps = [
  { n: "01", title: "Indsæt link", body: "Fra Boligsiden, Boliga, EDC — hvilken som helst annonce." },
  { n: "02", title: "Vi trækker data", body: "Pris, m², ejerudgifter — hentet automatisk fra annoncen." },
  { n: "03", title: "Få dommen", body: "Score 0–100 + én-linjes verdict. Ingen tvivl." },
  { n: "04", title: "Gem til portefølje", body: "Alle dine analyser samlet ét sted. Sammenlign handler over tid." },
];

export default function Home() {
  return (
    <main>
      <Nav theme="dark" />

      {/* 1 — HERO */}
      <section className="grain relative flex min-h-[88vh] items-center bg-navy-900 text-cream-100">
        <div className="container-x py-32 text-center">
          <Reveal>
            <p className="micro text-gold-400">
              Data-drevne beslutninger for danske ejendomsinvestorer
            </p>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="mx-auto mt-6 max-w-4xl font-serif text-5xl font-light leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
              Analysér enhver dansk ejendom på under{" "}
              <span className="italic text-gold-400">60 sekunder.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mx-auto mt-8 max-w-2xl text-lg text-cream-100/70">
              Ingen regneark. Ingen mæglere. Bare tal du kan stole på — og en klar
              dom om hvorvidt ejendommen er værd at investere i.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button href="/auth/signup" size="lg">
                Prøv Analyseren gratis
              </Button>
              <Button
                href="#saadan"
                variant="secondary"
                size="lg"
                className="text-cream-100"
              >
                Se hvordan det virker
              </Button>
            </div>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="mt-14">
              <p className="micro text-cream-100/40">Data hentet fra</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-cream-100/50">
                <span>Danmarks Statistik</span>
                <span className="text-cream-100/20">·</span>
                <span>Finanstilsynet</span>
                <span className="text-cream-100/20">·</span>
                <span>CVR</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 2 — PROBLEM */}
      <section className="bg-cream-50 py-24">
        <div className="container-x">
          <Reveal>
            <h2 className="max-w-3xl text-3xl md:text-5xl">
              At vurdere en ejendom bør ikke tage en weekend.
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {problems.map((p, i) => (
              <Reveal key={p.n} delay={i * 0.08}>
                <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
                  <div className="micro text-gold-600">{p.n}</div>
                  <h3 className="mt-4 text-xl">{p.title}</h3>
                  <p className="mt-3 text-stone-600">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 3 — SOLUTION */}
      <section className="grain bg-navy-900 py-24 text-cream-100">
        <div className="container-x grid items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <div className="max-w-md">
              <h2 className="text-3xl md:text-5xl">
                Én platform. Én dom. Under 60 sekunder.
              </h2>
              <ul className="mt-8 space-y-4">
                {[
                  "Bruttoafkast, nettoafkast, cash flow — beregnet automatisk",
                  "Rentestress-test med +2 procentpoint scenarie",
                  "5-årig prisprognose baseret på DST EJ55-data",
                  "Klar dom: køb, spring over, eller genforhandl",
                ].map((t) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-1 text-gold-400">✓</span>
                    <span className="text-cream-100/80">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <DashboardMockup />
          </Reveal>
        </div>
      </section>

      {/* 4 — SIX AGENTS */}
      <section className="bg-cream-50 py-24">
        <div className="container-x">
          <Reveal>
            <p className="micro text-gold-600">Hvad Analyseren gør</p>
            <h2 className="mt-4 text-3xl md:text-5xl">Seks analyser. Ét kort svar.</h2>
          </Reveal>
          <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((a, i) => (
              <Reveal key={a.n} delay={(i % 3) * 0.08}>
                <div className="rounded-2xl border border-stone-200 bg-white p-8">
                  <div className="font-mono text-2xl text-gold-500 tnum">{a.n}</div>
                  <h3 className="mt-3 text-xl">{a.title}</h3>
                  <p className="mt-2 text-stone-600">{a.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 5 — HOW IT WORKS */}
      <section id="saadan" className="grain scroll-mt-24 bg-navy-900 py-24 text-cream-100">
        <div className="container-x">
          <Reveal>
            <h2 className="text-3xl md:text-5xl">Fire trin. Tres sekunder.</h2>
          </Reveal>
          <div className="mt-14 grid gap-8 md:grid-cols-4">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08}>
                <div>
                  <div className="font-mono text-3xl text-gold-400 tnum">{s.n}</div>
                  <h3 className="mt-3 text-xl">{s.title}</h3>
                  <p className="mt-2 text-cream-100/70">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 6 — BAG NORDINVEST (no testimonials until 3+ real ones) */}
      <section className="bg-cream-50 py-24">
        <div className="container-x grid items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <div className="max-w-md">
              <p className="micro text-gold-600">Bag NordInvest</p>
              <h2 className="mt-4 text-3xl md:text-5xl">
                Bygget i det åbne. Del af rejsen.
              </h2>
              <p className="mt-6 text-stone-600">
                NordInvest bliver bygget lige nu — af én person, i offentligt lys.
                Jeg deler alt undervejs: hvad der virker, hvad der ikke gør, og
                hvorfor jeg tror data kan udligne spillefeltet for danske
                ejendomsinvestorer.
              </p>
              <p className="mt-4 text-stone-600">Følg med, hvis det interesserer dig.</p>
              <Button
                href="https://www.linkedin.com/"
                className="mt-8"
              >
                Følg på LinkedIn →
              </Button>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-900 font-serif text-2xl text-cream-100">
                  N
                </div>
                <div>
                  <div className="font-medium text-stone-900">Nikolaj S.</div>
                  <div className="text-sm text-stone-500">
                    Bygger NordInvest · Fund manager in the making
                  </div>
                </div>
              </div>
              <div className="mt-6 border-t border-stone-100 pt-6">
                <Button
                  href="https://www.linkedin.com/"
                  variant="secondary"
                  className="w-full"
                >
                  Se profil på LinkedIn
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 7 — PRICING TEASE */}
      <section className="grain bg-navy-900 py-24 text-cream-100">
        <div className="container-x">
          <Reveal>
            <h2 className="text-center text-3xl md:text-5xl">
              Start gratis. Skalér når du er klar.
            </h2>
          </Reveal>
          <div className="mt-14">
            <PricingCards theme="dark" />
          </div>
        </div>
      </section>

      {/* 8 — FINAL CTA */}
      <section className="bg-cream-50 py-28">
        <div className="container-x text-center">
          <Reveal>
            <h2 className="mx-auto max-w-2xl text-4xl md:text-6xl">
              Din næste analyse tager 60 sekunder.
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="mt-10">
              <Button href="/auth/signup" size="lg">
                Prøv Analyseren gratis
              </Button>
            </div>
            <p className="mt-4 text-sm text-stone-500">
              Ingen kreditkort. LinkedIn login. Klar på 30 sekunder.
            </p>
          </Reveal>
        </div>
      </section>

      <Footer />
    </main>
  );
}

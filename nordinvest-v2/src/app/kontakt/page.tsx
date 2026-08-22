import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { site } from "@/lib/site";
import { FounderPhoto } from "@/components/FounderPhoto";

export const metadata: Metadata = {
  title: "Kontakt",
  description:
    "Kom i kontakt med NordInvest — spørgsmål om produktet, salg, presse eller investering. Skriv til contact@nordinvest.io.",
};

export default function KontaktPage() {
  return (
    <main>
      <Nav />
      <section className="bg-cream-50 pt-32">
        <div className="container-x pb-24">
          <p className="micro text-gold-600">Kontakt</p>
          <h1 className="mt-6 max-w-3xl text-4xl md:text-6xl">Lad os tale sammen.</h1>
          <p className="mt-5 max-w-xl text-lg text-stone-600">
            Spørgsmål om produktet, salg, presse eller investering — skriv eller
            ring, så vender jeg hurtigt tilbage.
          </p>

          <div className="mt-14 grid items-start gap-12 lg:grid-cols-2">
            {/* Founder card */}
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              <FounderPhoto />
              <div className="p-6">
                <div className="font-serif text-2xl text-stone-900">
                  {site.founder.name}
                </div>
                <div className="mt-1 text-gold-600">{site.founder.role}</div>
                <div className="mt-6 space-y-4 border-t border-stone-100 pt-6">
                  <ContactRow label="Email">
                    <a
                      href={`mailto:${site.email}`}
                      className="font-mono text-stone-900 hover:text-navy-900"
                    >
                      {site.email}
                    </a>
                  </ContactRow>
                  <ContactRow label="Telefon">
                    <a
                      href={site.phoneHref}
                      className="font-mono text-stone-900 hover:text-navy-900"
                    >
                      {site.phone}
                    </a>
                  </ContactRow>
                  <ContactRow label="LinkedIn">
                    <a
                      href={site.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-stone-900 hover:text-navy-900"
                    >
                      nordinvest-io
                    </a>
                  </ContactRow>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-stone-200 bg-white p-6">
                <div className="micro text-gold-600">Skriv direkte</div>
                <p className="mt-2 text-stone-600">
                  Den hurtigste vej. Jeg læser hver mail selv.
                </p>
                <Button href={`mailto:${site.email}`} className="mt-4">
                  Send en mail →
                </Button>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-6">
                <div className="micro text-gold-600">Ring</div>
                <p className="mt-2 text-stone-600">
                  Hverdage. Kort snak om en handel eller produktet.
                </p>
                <Button href={site.phoneHref} variant="secondary" className="mt-4">
                  {site.phone}
                </Button>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-6">
                <div className="micro text-gold-600">Følg med</div>
                <p className="mt-2 text-stone-600">
                  Opbygningen deles i offentligt lys på LinkedIn.
                </p>
                <Button href={site.linkedin} variant="secondary" className="mt-4">
                  Åbn LinkedIn →
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function ContactRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-sm text-stone-400">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}
